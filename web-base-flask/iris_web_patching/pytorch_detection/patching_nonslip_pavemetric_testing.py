import os
import sys
import time

import cv2
import torch
from ..pytorch_detection import models, utils
sys.modules['models'] = models
sys.modules['utils'] = utils
from .models.experimental import attempt_load
from .utils.datasets import convert_img
from .utils.general import check_img_size, non_max_suppression, scale_coords, set_logging
from .utils.torch_utils import select_device

import xml.etree.ElementTree as ET


def GenerateXML(save_annot_path, filename, width, height, name_list, bboxes_list):
    root = ET.Element("annotation")

    root_filename = ET.SubElement(root, "filename")
    root_filename.text = filename

    size = ET.SubElement(root, "size")
    size_width = ET.SubElement(size, "width")
    size_width.text = str(width)
    size_height = ET.SubElement(size, "height")
    size_height.text = str(height)

    for i, name in enumerate(name_list):
        # print("bboxes_list[i]", bboxes_list[i])
        xmin, ymin, xmax, ymax = bboxes_list[i]
        if ymax < 2 or xmax < 2:
            continue
        xmin, ymin, xmax, ymax = max(xmin, 1), max(ymin, 1), min(width - 1, xmax), min(height - 1, ymax)
        object1 = ET.SubElement(root, "object")
        object1_name = ET.SubElement(object1, "name")
        object1_name.text = name

        object1_pose = ET.SubElement(object1, "pose")
        object1_pose.text = 'Unspecified'

        object1_truncated = ET.SubElement(object1, "truncated")
        object1_truncated.text = '1'

        object1_difficult = ET.SubElement(object1, "difficult")
        object1_difficult.text = '0'

        object1_bndbox = ET.SubElement(object1, "bndbox")
        bndbox_xmin = ET.SubElement(object1_bndbox, "xmin")
        bndbox_ymin = ET.SubElement(object1_bndbox, "ymin")
        bndbox_xmax = ET.SubElement(object1_bndbox, "xmax")
        bndbox_ymax = ET.SubElement(object1_bndbox, "ymax")
        bndbox_xmin.text = str(xmin)
        bndbox_ymin.text = str(ymin)
        bndbox_xmax.text = str(xmax)
        bndbox_ymax.text = str(ymax)

    tree = ET.ElementTree(root)
    # write xml file
    tree.write(save_annot_path, encoding='utf-8', xml_declaration=True)


def detect_single_img(img0, imgsz, stride, device, half, model, names, old_img_b, old_img_h, old_img_w, conf_thres,
                      iou_thres, augment=False):
    # print(img_path)
    # img0 = cv2.imread(img_path)
    img = convert_img(img0, imgsz, stride, device, half)

    # Warmup
    if device.type != 'cpu' and (
            old_img_b != img.shape[0] or old_img_h != img.shape[2] or old_img_w != img.shape[3]):
        for i in range(3):
            model(img, augment=augment)[0]

    # Inference
    with torch.no_grad():  # Calculating gradients would cause a GPU memory leak
        pred = model(img, augment=augment)[0]

    # Apply NMS
    pred = non_max_suppression(pred, conf_thres, iou_thres)

    # Process detections
    name_list = []
    bboxes_list = []
    score_list = []
    for i, det in enumerate(pred):  # detections per image

        if len(det):
            # Rescale boxes from img_size to im0 size
            det[:, :4] = scale_coords(img.shape[2:], det[:, :4], img0.shape).round()

            # Write results

            for *xyxy, conf, cls in reversed(det):
                # label = f'{names[int(cls)]} {conf:.2f}'
                label = f'{names[int(cls)]}'
                score = f'{conf:.2f}'
                score_list.append(score)
                name_list.append(label)
                bboxes_list.append([int(xyxy[0]), int(xyxy[1]), int(xyxy[2]), int(xyxy[3])])
    return name_list, bboxes_list, score_list


def patching_condition_10m(names, bboxes, scores, road_marking_left=500, road_marking_right=3600):
    new_names, new_bboxes, checking_list = [], [], []
    for name, bbox, score in zip(names, bboxes, scores):
        xmin, ymin, xmax, ymax = bbox
        # skip object is outside road marking
        if xmin > road_marking_right or xmax < road_marking_left:
            continue
        if name in ['nonslip_small', 'nonslip_small_black']:
            new_names.append('nonslip')
            # change xmin and xmax according to road marking
            xmin = max(xmin, road_marking_left)
            xmax = min(xmax, road_marking_right)
            new_bboxes.append([xmin, ymin, xmax, ymax])

        elif name == 'patching':
            patching_width = min(xmax, road_marking_right) - max(xmin, road_marking_left)
            # patching width > 2500mm and position is between 2 images
            if patching_width > 2500 and (ymin < 1000 or ymax > 9000):
                # patching width > 2500mm and position is between current image and next image
                if ymin < 1000:
                    checking_list.append(ymin)
                continue

            # patching width < 400mm and position is between 2 images
            if patching_width < 400 and (ymin < 1000 or ymax > 9000):
                if ymin < 1000:
                    checking_list.append(ymin)
                continue

            new_names.append(name)
            # adjust xmin and xmax according to road marking
            xmin, ymin, xmax, ymax = max(xmin, road_marking_left), ymin, min(xmax, road_marking_right), ymax
            new_bboxes.append([xmin, ymin, xmax, ymax])

    return new_names, new_bboxes, checking_list


def patching_condition_20m(names, bboxes, scores, road_marking_left=500, road_marking_right=3600):
    current_names, current_bboxes, next_names, next_bboxes = [], [], [], []
    for name, bbox, score in zip(names, bboxes, scores):

        if name == 'patching':
            xmin, ymin, xmax, ymax = bbox
            # skip patching is outside road marking
            if xmin > road_marking_right or xmax < road_marking_left:
                continue

            patching_width = min(xmax, road_marking_right) - max(xmin, road_marking_left)

            # patching width > 2500mm and patching_length > 10000mm
            if patching_width > 2500 and (ymin < 1000 or ymax > 19000):
                continue

            # patching width < 400mm and patching_length > 10000mm
            if patching_width < 400 and (ymin < 1000 or ymax > 19000):
                continue

            # patching in inside two images
            # patching is in the current image
            if ymin > 10000:
                current_names.append(name)
                # change the y coordinate of patching for current image
                current_bboxes.append(
                    [max(xmin, road_marking_left), ymin - 10000, min(xmax, road_marking_right), ymax - 10000])
            # patching is between current image and next image
            elif ymin < 10000 and ymax > 10000:
                # change the y coordinate of patching for current image
                current_names.append(name)
                current_bboxes.append([max(xmin, road_marking_left), 0, min(xmax, road_marking_right), ymax - 10000])

                # change the y coordinate of patching for next image
                next_names.append(name)
                next_bboxes.append([max(xmin, road_marking_left), ymin, min(xmax, road_marking_right), 10000])

    return current_names, current_bboxes, next_names, next_bboxes


def get_road_marking(annotation_path):
    et = ET.parse(annotation_path)
    root = et.getroot()

    road_marking_list = []
    for obj in root.iter('object'):
        name = obj.find('name').text
        if name == 'lm':
            road_marking_list.append(
                int(int(obj.find('bndbox').find('xmin').text) / 2 + int(obj.find('bndbox').find('xmax').text) / 2))
    # sort road_marking_list in ascending order
    road_marking_list.sort()
    return road_marking_list[0], road_marking_list[1]


def draw_bboxes(img10m, name_list, bboxes_list):
    for name, bbox in zip(name_list, bboxes_list):
        xmin, ymin, xmax, ymax = bbox
        print(xmin, ymin, xmax, ymax)
        # set color with name
        if name == 'patching':  # red
            color = (0, 0, 255)
        elif name == 'nonslip':  # green
            color = (0, 255, 0)
        else:
            color = (255, 0, 0)
        # cv2.rectangle(img10m, (xmin, ymin), (xmax, ymax), (0, 255, 0), 2)
        cv2.rectangle(img10m, (xmin, ymin), (xmax, ymax), color, 5)
        # if box postion on the top the change the text position
        if ymin < 500:
            cv2.putText(img10m, name, (xmin, ymin + 200), cv2.FONT_HERSHEY_SIMPLEX, 10, color, 6)
        else:
            cv2.putText(img10m, name, (xmin, ymin - 20), cv2.FONT_HERSHEY_SIMPLEX, 10, color, 6)


def detect_survey_data(source, root_path,
                       weights="/pytorch_detection/best.pt",
                       imgsz=640, device="0", conf_thres=0.5, iou_thres=0.5):
    # Directories
    weights = root_path + weights
    print(weights)

    save_dir = os.path.join(os.path.dirname(source), "AI_results",
                            "xml_patching_nonslip_result")
    save_img_dir = os.path.join(os.path.dirname(source), "AI_results",
                                "images")
    if not os.path.exists(save_dir):
        os.makedirs(save_dir)
    if not os.path.exists(save_img_dir):
        os.makedirs(save_img_dir)

    # Initialize
    set_logging()
    device = select_device(device)
    half = device.type != 'cpu'  # half precision only supported on CUDA

    # Load model

    model = attempt_load(weights, map_location=device)  # load FP32 model
    stride = int(model.stride.max())  # model stride
    imgsz = check_img_size(imgsz, s=stride)  # check img_size

    if half:
        model.half()  # to FP16

    # Get names and colors
    names = model.module.names if hasattr(model, 'module') else model.names

    # Run inference
    if device.type != 'cpu':
        model(torch.zeros(1, 3, imgsz, imgsz).to(device).type_as(next(model.parameters())))  # run once
    old_img_w = old_img_h = imgsz
    old_img_b = 1

    t0 = time.time()

    img_path_list = [os.path.join(source, i) for i in os.listdir(source)]
    img_path_list.sort()

    previous_names = []
    previous_bboxes = []
    for img_10m_index, img_path in enumerate(img_path_list):
        print(img_path)
        try:
            road_marking_left, road_marking_right = get_road_marking(
                os.path.join(os.path.dirname(source), f"{os.path.basename(os.path.dirname(source))}_AI_results",
                             "xml_result", os.path.basename(img_path).replace('.jpg', '.xml')))
        except:
            road_marking_left, road_marking_right = 600, 3400
        img10m = cv2.imread(img_path)
        print("10 m image detection started")
        name_list_10m, bboxes_list_10m, score_list_10m = detect_single_img(img10m, imgsz, stride, device, half, model,
                                                                           names, old_img_b, old_img_h, old_img_w,
                                                                           conf_thres, iou_thres)

        name_list_10m, bboxes_list_10m, checking_list = patching_condition_10m(name_list_10m, bboxes_list_10m,
                                                                               score_list_10m,
                                                                               road_marking_left=road_marking_left,
                                                                               road_marking_right=road_marking_right)

        current_names, current_bboxes, next_names, next_bboxes = [], [], [], []
        if checking_list:
            if img_10m_index + 1 > len(img_path_list) - 1: continue
            print("20 m image detection started")
            img10m_next = cv2.imread(img_path_list[img_10m_index + 1])
            img20m = cv2.vconcat([img10m_next, img10m])
            name_list_20m, bboxes_list_20m, score_list_20m = detect_single_img(img20m, imgsz, stride, device, half,
                                                                               model, names, old_img_b, old_img_h,
                                                                               old_img_w, conf_thres, iou_thres)

            current_names, current_bboxes, next_names, next_bboxes = patching_condition_20m(name_list_20m,
                                                                                            bboxes_list_20m,
                                                                                            score_list_20m,
                                                                                            road_marking_left=road_marking_left,
                                                                                            road_marking_right=road_marking_right)

        # write result annotations
        name_list = name_list_10m + current_names + previous_names
        bboxes_list = bboxes_list_10m + current_bboxes + previous_bboxes
        save_path = os.path.join(save_dir, os.path.basename(img_path))  # img.jpg
        save_annot_path = save_path.replace(".jpg", ".xml")
        filename = os.path.basename(save_path)
        height, width, _ = img10m.shape
        GenerateXML(save_annot_path, filename, width, height, name_list, bboxes_list)

        # set previous objects for next image
        previous_names = next_names
        previous_bboxes = next_bboxes

        # draw bboxes in image
        draw_bboxes(img10m, name_list, bboxes_list)

        save_img_path = os.path.join(save_img_dir, os.path.basename(img_path))
        cv2.imwrite(save_img_path, img10m)

    print(f'Done. ({time.time() - t0:.3f}s)')


def patching_nonslip_detection_for_app(load_img_folder_path, root_path):
    with torch.no_grad():
        detect_survey_data(source=load_img_folder_path, root_path=root_path)

# if __name__ == '__main__':
#     device = "0"  # cuda device, i.e. 0 or 0,1,2,3 or cpu
#     weight_path = "best.pt"
#     load_folder_path = "/media/iris/Dong/Dong_patching_nonslip/pavemetric/data/포항 신흥로 시험포장 상태 조사 2"
#
#     for path_original, between, fnames in os.walk(load_folder_path):
#         elem_to_find = os.path.basename(path_original) + '_표면결함'
#         res1 = any(elem_to_find in sublist for sublist in between)
#         if res1:
#             load_img_folder_path = os.path.join(path_original, elem_to_find)
#             print(f"analysing {load_img_folder_path}")
#             with torch.no_grad():
#                 detect_survey_data(source=load_img_folder_path, weights="best.pt", imgsz=640, device="0", conf_thres=0.5, iou_thres=0.5)
