from sqlalchemy.sql import func

from . import db
from flask_login import UserMixin

import xml.etree.ElementTree as ET


class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(150), unique=True)
    password = db.Column(db.String(150))
    user_name = db.Column(db.String(150))

    def __init__(self, email, password, user_name):
        self.email = email
        self.password = password
        self.user_name = user_name


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
        bndbox_xmin.text = str(int(xmin))
        bndbox_ymin.text = str(int(ymin))
        bndbox_xmax.text = str(int(xmax))
        bndbox_ymax.text = str(int(ymax))

    tree = ET.ElementTree(root)

    with open(save_annot_path, "wb") as files:
        tree.write(files)

