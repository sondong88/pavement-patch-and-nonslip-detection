import json
import os.path
import shutil
from datetime import datetime

from flask import Blueprint, render_template, request, flash, jsonify, url_for
from flask_login import login_required, current_user

from . import db
from .models import GenerateXML
from flask import current_app

from PIL import Image

# from .pytorch_detection.detect_dir_v84_full_tmp_lm import crack_detection

views = Blueprint("views", __name__, static_folder='static/uploads')


# UPLOADS_FOLDER = os.path.join(current_app.root_path, 'static', 'uploads')

@views.route('/home', methods=["GET", "POST"])
@views.route('/', methods=["GET", "POST"])
@login_required
def home():
    return render_template("index.html", user=current_user)


@views.route('/manual-checking', methods=["GET", "POST"])
@login_required
def manual_checking():
    return render_template("manual-checking.html", user=current_user)


@views.route('/i-crack', methods=["GET", "POST"])
@login_required
def i_crack():
    return render_template("i-crack.html", user=current_user)


@views.route('/save_coordinates', methods=['POST', 'GET'])
def save_coordinates():
    # Retrieve the coordinates from the JSON data in the request
    data_annotation = request.get_json()
    username = current_user.user_name
    print(username)
    print(data_annotation)
    xml_file_path_list = []
    username_current_time = f'{username}_{datetime.today().strftime("%Y-%m-%d_%H-%M-%S")}'
    user_uploads_folder_path = os.path.join(current_app.root_path, 'static', 'uploads', username_current_time)
    if not os.path.exists(user_uploads_folder_path):
        os.makedirs(user_uploads_folder_path)

    for data in data_annotation:
        if not data:
            continue
        print(f"coordinate: {data}")
        image_name = data['imageName']
        image_scale = data['imageScale']

        print(image_name)

        save_annot_path = os.path.join(user_uploads_folder_path, f'{os.path.splitext(image_name)[0]}.xml')
        xml_file_path_list.append(save_annot_path)

        name_list = []
        bboxes_list = []
        for box in data['boxes']:
            x = box['left']
            y = box['top']
            width = box['width']
            height = box['height']
            label = box['label']
            name_list.append(label)
            bboxes_list.append(
                [x * image_scale, y * image_scale, (x + width) * image_scale, (y + height) * image_scale])

        # Process the coordinates and save them in an XML file
        GenerateXML(save_annot_path, image_name, int(data['imageWidth']), int(data['imageHeight']), name_list,
                    bboxes_list)

    # Create a ZIP archive of the XML files
    zip_filename = f'{username_current_time}.zip'
    shutil.make_archive(user_uploads_folder_path, "zip", user_uploads_folder_path)

    shutil.rmtree(user_uploads_folder_path)

    # Return the link to the ZIP archive
    return jsonify({'zip_link': url_for('views.static', filename=zip_filename)})


@views.route('/process-images', methods=['POST'])
def process_images():
    from .pytorch_detection.patching_nonslip_pavemetric_testing import patching_nonslip_detection_for_app
    # try:
    print("Processing started")
    # Get the uploaded images from the 'image[]' field of the FormData
    uploaded_images = request.files.getlist('image[]')

    processed_image_urls = []

    # Create a folder to store the processed images
    username = current_user.user_name
    username_current_time = f'{username}_crack_{datetime.today().strftime("%Y-%m-%d_%H-%M-%S")}'
    user_uploads_folder_path = os.path.join(current_app.root_path, 'static', 'uploads', username_current_time,
                                            "image_표면결함")

    if not os.path.exists(user_uploads_folder_path):
        os.makedirs(user_uploads_folder_path)

    # Process each uploaded image
    for uploaded_image in uploaded_images:
        # Save the uploaded image temporarily
        filename = os.path.join(user_uploads_folder_path, uploaded_image.filename)
        print(filename)
        uploaded_image.save(filename)

    # applying patching detection
    print("detecting", user_uploads_folder_path)
    patching_nonslip_detection_for_app(user_uploads_folder_path, current_app.root_path)
    # try:
    #     print("detecting", user_uploads_folder_path)
    #     patching_nonslip_detection_for_app(user_uploads_folder_path, current_app.root_path)
    # except Exception as e:
    #     print(e)

    # resulted images are saved in the user_uploads_folder_path
    resulted_image_folder_path = os.path.join(os.path.dirname(user_uploads_folder_path), "AI_results",
                                              "images")
    processed_image_urls = [url_for('views.static', filename=f"{username_current_time}/AI_results/images/{i}")
                            for i in os.listdir(resulted_image_folder_path)]

    return jsonify({'message': 'Images processed successfully', 'processed_image_urls': processed_image_urls}), 200

    # except Exception as e:
    #     return jsonify({'error': str(e)}), 500
