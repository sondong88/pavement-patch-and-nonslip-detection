// images
// import xml2js from "xml2js";

let imageDataArray = [];
let imageNames = [];
let images = [];
let imageInformation = [];
let currentImageIndex = 0;

let annotationDataArray = [];

let imageContainer = document.getElementById('image-container');
// Calculate the maximum width for the container (e.g., 600px)
const maxWidth = 600;
const maxHeight = 900;
let scale = 1;

// labels
let labelContainer = document.getElementById('label-container');
let labelInput = document.getElementById('label-input');

let labelContainerEdit = document.getElementById('label-container-edit');
let labelInputEdit = document.getElementById('label-input-edit');
let boxes = [];

let labelCategory = [];

// drawing boxes
let isDrawing = false;
let isStartDrawing = false;
let isStartResizing = false;
let isResizing = false;
let currentBox = null; // Variable to keep track of the current box being drawn
let selectedBox = null;
let selectedLabel = null;
let startX, startY, endX, endY;

let resizingHandle = 0;
let initialBoxWidth = 0;
let initialBoxHeight = 0;
let initialMouseX = 0;
let initialMouseY = 0;
let newLeft = 0;
let newTop = 0;


// change current image
let nextImageButton = document.getElementById('next-image-button');
let previousImageButton = document.getElementById('previous-image-button');

// Add event listener to the "Load Image" button
document.getElementById('load-image-button').addEventListener('click', loadImages);

// Add event listener to the file input for image loading
// document.getElementById('image-input').addEventListener('change', previewImages);
document.getElementById('image-input').addEventListener('change', previewImages);


// Add event listener to the "Load Image" button
document.getElementById('load-annotation-button').addEventListener('click', loadAnnotations);

// Add event listener to the file input for image loading
// document.getElementById('image-input').addEventListener('change', previewImages);
document.getElementById('annotation-input').addEventListener('change', (event) => previewAnnotations(event, updateAnnotation));


// Add event listeners to handle the drawing
imageContainer.addEventListener('mousedown' , event => {
    startDrawing(event);
    // console.log("startdraw");
});
imageContainer.addEventListener('mousemove', event => {
    if (isStartDrawing && isImagesLoaded && !isStartResizing)  {
        // Draw a new box
        drawBox(event);
        isDrawing = true;
        isLabelEntered = false; // Reset the flag when starting to draw a new box
    } else if (isStartResizing) {
        // Resize the selected box
        resizeBox(event);
    }
});
imageContainer.addEventListener('mouseup', event => {
    if (isDrawing && isStartDrawing) {
        // Stop drawing
        stopDrawing(event);
    } else if (isResizing && isStartResizing) {
        // Stop resizing the selected box
        stopResizing(event);
    }
    isDrawing = false;
    isStartDrawing = false;
    isResizing = false;
    isResizing = false;
    isStartResizing = false;
});

// // Add event listeners to handle drawing and resizing
// imageContainer.addEventListener('mousedown', handleMouseDown);
// imageContainer.addEventListener('mousemove', handleMouseMove);
// imageContainer.addEventListener('mouseup', handleMouseUp);


// Add event listener to boxes for toggling transparency
imageContainer.addEventListener('dblclick', event => {
    // console.log("sdfsdfsdfs", event.target)
    if (event.target.classList.contains('box')) {
        const clickedBox = event.target;
        // currentBox = clickedBox;
        toggleBoxTransparencyEvent(clickedBox);
        // console.log("clickthebox")
    }
});



// Add event listener to the "Next Image" button
nextImageButton.addEventListener('click', () => {
    if (isLabelEntered) {
        showNextImage();
        // isLabelEntered = false; // Reset the flag after moving to the next image
        // clearTransparentBox(); // Clear transparent box when switching images
    }
});

// Add event listener to the "Previous Image" button
previousImageButton.addEventListener('click', () => {
    if (isLabelEntered) {
        showPreviousImage();
        // isLabelEntered = false; // Reset the flag after moving to the previous image
        // clearTransparentBox(); // Clear transparent box when switching images
    }
});



// Initialize a flag to track if a label has been entered
let isLabelEntered = true;
let isImagesLoaded = false; // Flag to track if images are loaded


document.addEventListener('keydown', event => {
    // console.log(event.key, currentBox);
    if (event.key === 'Delete') {
        deleteSelectedBox();
        showCurrentImage();
    }
});

// Function to choose an image and show it in the image container
function loadImages() {
    document.getElementById('image-input').click();
}

function loadAnnotations() {
    document.getElementById('annotation-input').click();
}


// show image name list and the current image
function previewImages (event) {
    const files = event.target.files;

    imageNames.length = 0; // Clear the array
    images.length = 0; // Clear the array
    imageDataArray.length = 0; // Clear the array
    imageInformation.length = 0; // Clear the array
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();

        reader.onload = function () {
            const image = new Image();
            image.src = reader.result;
            image.onload = function () {
                // Update the image names list with the original file names
                // console.log(file)
                imageNames.push(file.name);
                images.push(image); // Push the loaded image to the images array
                imageInformation.push([image.width, image.height]); // Push the width and height into array
                // Store the data of the drawn box and its associated label for the current image
                imageDataArray.push({
                    imageName: file.name,
                    imageHeight: image.height,
                    imageWidth: image.width,
                    imageScale: Math.max(image.height/maxHeight, image.width/maxWidth),
                    boxes: [],
                });
                if (imageNames.length === files.length) {
                    isImagesLoaded = true; // Mark images as loaded
                    // create the image array matching with the loaded images
                    imageDataArray.length = imageNames.length
                    // All images are loaded, display the first image
                    showImageNames();
                    showCurrentImage();
                     // Update the label information frame
                    displayImageInfo();
                    alert("Load images is done");
                };
            };
        };
        if (file) {
            reader.readAsDataURL(file);
        }
    }
    // console.log(imageDataArray)

}



function previewAnnotations(event, updateAnnotation) {
    const files = event.target.files;

    // Clear existing annotation data arrays
    annotationDataArray.length = 0;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();

        reader.onload = function () {
            const xmlData = reader.result;
            // console.log(xmlData);
            const annotationData = parseXML(xmlData);
            // console.log(annotationData)
            annotationDataArray.push({xmlName: file.name, boxes: annotationData}); // Push the name and annotations into array
            // console.log(annotationDataArray)
            updateAnnotation(file.name, annotationData);
        };

        if (file) {
            reader.readAsText(file); // Read XML files as text
        }
    }
    alert("Load annotations is done");
}

function updateAnnotation(xmlName, annotationData) {
    for (let i = 0; i < imageDataArray.length; i++) {
        const imageElement = imageDataArray[i];

        const nameImage = imageElement['imageName'].substring(0, imageElement['imageName'].length - 4);

        const nameAnnotation = xmlName.substring(0, xmlName.length - 4);

        if (nameImage === nameAnnotation) {
            for (let k = 0; k < annotationData.length; k++) {
                const currentScale = parseFloat(annotationData[k]['scale']);
                imageDataArray[i].boxes.push({
                    left: parseInt(annotationData[k]['xmin'])/currentScale,
                    top: parseInt(annotationData[k]['ymin'])/currentScale,
                    width: (parseInt(annotationData[k]['xmax']) - parseInt(annotationData[k]['xmin']))/currentScale,
                    height: (parseInt(annotationData[k]['ymax']) - parseInt(annotationData[k]['ymin']))/currentScale,
                    label: annotationData[k]['label'],
                });

                if (!labelCategory.includes(annotationData[k]['label'])) {
                    labelCategory.push(annotationData[k]['label']);
                }
            }
        }
    }
}

function parseXML(xmlData) {
    const annotationData = [];

    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlData, 'text/xml');

    const objects = doc.getElementsByTagName('object');
    const imageWidth = parseInt(doc.getElementsByTagName('width')[0].textContent);
    const imageHeight = parseInt(doc.getElementsByTagName('height')[0].textContent);

    scale = Math.max(imageWidth/maxWidth, imageHeight/maxHeight);
    console.log("scale", scale)


    for (const object of objects) {
        const name = object.getElementsByTagName('name')[0].textContent;
        const xmin = object.getElementsByTagName('xmin')[0].textContent;
        const ymin = object.getElementsByTagName('ymin')[0].textContent;
        const xmax = object.getElementsByTagName('xmax')[0].textContent;
        const ymax = object.getElementsByTagName('ymax')[0].textContent;


      annotationData.push({'label': name, xmin, xmax, ymin, ymax, 'scale': scale});
    }

    // console.log(annotationData);
    return annotationData;

}




// show image name list
function showImageNames () {
    // currentImageIndex = (currentImageIndex+1) % images.length;
    currentImageIndex = currentImageIndex % images.length;
    const imageList = document.getElementById('image-list');
    imageList.innerHTML = '';

    for (let i = 0; i < imageNames.length; i++) {
        const imageName = imageNames[i];
        const listItem = document.createElement('li');
        listItem.textContent = imageName;
        // interaction with user
        listItem.addEventListener('click', () => switchToImage(i));
        imageList.appendChild(listItem);
    }
}



// switch to the selected image
function switchToImage(index) {
        currentImageIndex = index;
        showCurrentImage();
    }


// switch to previous image
function showPreviousImage() {
    currentImageIndex = currentImageIndex - 1;
    showCurrentImage();
}

// switch to previous image
function showNextImage() {
    currentImageIndex = currentImageIndex + 1;
    showCurrentImage();
}


// highlight the current image name
function highlightSelectedImageName() {
    // Get all the list items in the image list
    const imageListItems = document.querySelectorAll('#image-list li');

    // Remove the 'selected' class from all list items
    imageListItems.forEach(item => item.classList.remove('selected'));

    // Add the 'selected' class to the currently selected image name
    if (currentImageIndex >= 0 && currentImageIndex < imageListItems.length) {
        imageListItems[currentImageIndex].classList.add('selected');
    }
}

// show current image
function showCurrentImage() {
    // currentImageIndex = (currentImageIndex + 1) % images.length;
    currentImageIndex = currentImageIndex % images.length;

    const image = images[currentImageIndex];

    // Clear existing boxes and labels when switching to a new image
    imageContainer.innerHTML = '';
    imageContainer.appendChild(image);
    resizeImage(image);

    highlightSelectedImageName(); // highlight image name on the name list

    // Clear previous drawing (if any)
    clearDrawing();

    // Check if image data exists for the current image, if yes, restore the boxes and labels
    if (imageDataArray[currentImageIndex]) {
        const imageData = imageDataArray[currentImageIndex];
        imageData.boxes.forEach(boxData => {
            const box = createBoxElement(boxData);
            imageContainer.appendChild(box);

            // If there is a label, create a label element and position it accordingly
            if (boxData.label) {
                const label = createLabelElement(boxData.label, boxData.left, boxData.top);
                imageContainer.appendChild(label);
            }
        });
    }

    displayImageInfo();

}


// Function to create a box element and set its style and position
function createBoxElement(boxData) {
    const box = document.createElement('div');
    box.className = 'box';
    box.style.left = boxData.left + 'px';
    box.style.top = boxData.top + 'px';
    box.style.width = boxData.width + 'px';
    box.style.height = boxData.height + 'px';
    box.style.borderColor = getColorForCategory(boxData.label); // Set the border color based on category
    return box;
}

function getColorForCategory(label) {
    // Get the category from the label
    let labelIndex = labelCategory.indexOf(label);

    // Check if the category exists in the mapping
    const categoryColorMap = ['red', 'green', 'blue', 'yellow', 'purple', 'orange', 'pink', 'cyan', 'magenta', 'olive'];

    // Check if the category exists in the mapping, default to 'black' if not found
    return categoryColorMap[labelIndex] || 'white';
}



// Function to create a label element and set its content and position
function createLabelElement(labelText, left, top) {
    const label = document.createElement('div');
    label.className = 'label';
    label.style.left = left + 'px';
    label.style.top = top + 'px';
    label.textContent = labelText;
    return label;
}


function clearDrawing() {
    // Remove all boxes and labels from the image container
    const boxesAndLabels = imageContainer.querySelectorAll('.box, .label');
    boxesAndLabels.forEach(element => element.remove());

    // Clear the boxes array
    boxes = [];
}

// Update the resizeImage function
function resizeImage(image) {
    // Get the dimensions of the loaded image
    // console.log("begin", image.width, image.height)
    const imageWidth = image.width;
    const imageHeight = image.height;

    const scaleWidth = imageWidth/ maxWidth;
    const scaleHeight = imageHeight/ maxHeight;
    console.log(scaleWidth, scaleHeight);


    // Calculate the container's width and height based on the image's dimensions
    let containerWidth, containerHeight;
    if (scaleWidth > scaleHeight) {
        if (imageWidth > maxWidth) {
        // If the image is wider than the maximum width, set container width to maxWidth
        containerWidth = maxWidth;
        containerHeight = (maxWidth / imageWidth) * imageHeight;
        } else {
            // If the image is smaller or equal to the maximum width, use its dimensions
            // console.log("again")
            containerWidth = imageWidth;
            containerHeight = imageHeight;
        }
    } else {
        if (imageHeight > maxHeight) {
        // If the image is wider than the maximum width, set container width to maxWidth
        containerHeight = maxHeight;
        containerWidth = (maxHeight / imageHeight) * imageWidth;
        } else {
            // If the image is smaller or equal to the maximum width, use its dimensions
            containerWidth = imageWidth;
            containerHeight = imageHeight;
        }
    }


    // Set the container's dimensions
    imageContainer.style.width = containerWidth + 'px';
    imageContainer.style.height = containerHeight + 'px';

    // Set the image's dimensions to match the container's width
    // image.style.width = '100%';
    image.style.width = containerWidth + 'px';

    // Add a class to the image content for styling
    // image.classList.add('image-content');
    console.log("end", image.width, image.height);
    console.log("frame", imageContainer.style.width, imageContainer.style.height);
}


// starting drawing the box of annotations
function startDrawing(event) {
    // Clear resizing mode
    isResizing = false;
    if (isLabelEntered && event.button === 0 && isImagesLoaded) {
        event.preventDefault();

        startX = event.clientX - imageContainer.getBoundingClientRect().left;
        startY = event.clientY - imageContainer.getBoundingClientRect().top;
        currentBox = document.createElement('div');
        currentBox.className = 'box';
        currentBox.style.left = startX + 'px';
        currentBox.style.top = startY + 'px';

        // If no box is clicked, start drawing a new box
        isStartDrawing = true;
    }
}

function drawBox(event) {
    if (isStartDrawing && isImagesLoaded){
        endX = event.clientX - imageContainer.getBoundingClientRect().left;
        endY = event.clientY - imageContainer.getBoundingClientRect().top;

        let x = Math.min(startX, endX);
        let y = Math.min(startY, endY);
        let width = Math.abs(endX - startX);
        let height = Math.abs(endY - startY);

        currentBox.style.left = x + 'px';
        currentBox.style.top = y + 'px';
        currentBox.style.width = width + 'px';
        currentBox.style.height = height + 'px';

        // Adjust the position of the label container based on the position of the box
        imageContainer.appendChild(currentBox);
        labelContainer.style.left = currentBox.style.left;
        labelContainer.style.top = currentBox.style.top;

        isDrawing = true;
        isLabelEntered = false; // Reset the flag when starting to draw a new box
    } else {
        isStartDrawing = false;
    }
}

function stopDrawing() {
    // console.log(isStartDrawing, isDrawing, isLabelEntered);
    if (isDrawing && isStartDrawing) {
        labelInput.style.display = 'block';
        labelInput.value = "label_iris";
        labelInput.focus();
        labelContainer.style.display = 'block';
    }
    isDrawing = false;
    isStartDrawing = false;

}

// Function to handle label input and display label on top of the box
function handleLabelInput(event) {
    if (event.key === 'Enter') {
        updateLabel();
        updateLabelList();
        showCurrentImage();
        isLabelEntered = true; // Set the flag when a label is entered
    }
}


// Function to handle label input and display label on top of the box
function handleLabelInputEdit(event) {
    if (event.key === 'Enter') {
        updateLabelEdit();
        showCurrentImage();
        isLabelEntered = true; // Set the flag when a label is entered
    }
}


function updateLabel() {
    // making label on box after enter name in label input
    let label = document.createElement('div');
    label.className = 'label';
    label.style.left = currentBox.style.left;
    label.style.top = currentBox.style.top;
    label.textContent = labelInput.value;
    imageContainer.appendChild(label);

    // collect box information into boxes
    boxes.push({
        x: parseFloat(currentBox.style.left),
        y: parseFloat(currentBox.style.top),
        width: parseFloat(currentBox.style.width),
        height: parseFloat(currentBox.style.height),
        label: label.textContent
    });

    // collect label information into labelCategory
    if (!labelCategory.includes(labelInput.value)) {
        labelCategory.push(labelInput.value);

    }


    imageDataArray[currentImageIndex].boxes.push({
        left: parseFloat(currentBox.style.left),
        top: parseFloat(currentBox.style.top),
        width: parseFloat(currentBox.style.width),
        height: parseFloat(currentBox.style.height),
        label: labelInput.value,
    });

    // clear label container after enter label
    labelInput.value = ''; // Reset the label input after saving the label
    labelInput.style.display = 'none';
    // currentBox = null;
    labelContainer.style.display = 'none';

    // console.log(boxes);
    updateLabelList(); // Update the label into frame of label information
}


function updateLabelEdit() {
    const editedLabel = labelInputEdit.value;

    // Find the index of the currentBox in the boxes array
    const boxIndex = boxes.findIndex(box => box === currentBox);

    if (boxIndex !== -1) {
        // Update the label of the existing box in the boxes array
        boxes[boxIndex].label = editedLabel;
    }

    // Find the currentBox data in the imageDataArray
    if (imageDataArray[currentImageIndex]) {
        const imageData = imageDataArray[currentImageIndex];
        const boxData = imageData.boxes.find(box => box.left === parseFloat(currentBox.left) && box.top === parseFloat(currentBox.top));

        if (boxData) {
            // Update the label of the existing box in the imageDataArray
            boxData.label = editedLabel;
        }
    }

    // Update the label element on the currentBox
    const labelElement = currentBox.nextElementSibling; // Assuming the label element follows the box element
    if (labelElement && labelElement.classList.contains('label')) {
        labelElement.textContent = editedLabel;
    }

    // Clear and hide the label input
    labelInputEdit.value = '';
    labelInputEdit.style.display = 'none';
    labelContainerEdit.style.display = 'none';

    updateLabelList(); // Update the label list frame
}


function displayImageInfo() {
      const currentImageName = imageNames[currentImageIndex];
      const imageInfoElement = document.getElementById('info-image-name');
      imageInfoElement.textContent = currentImageName;

      updateLabelList(); // Update the label list frame
}

function updateLabelList() {
    // console.log(currentImageIndex)
    // console.log(imageDataArray[currentImageIndex])
    if (imageDataArray[currentImageIndex]) {
        const imageData = imageDataArray[currentImageIndex];
        const labelList = document.getElementById('label-list');
        labelList.innerHTML = '';

        for (const box of imageData.boxes) {
            const listItem = document.createElement('li');
            listItem.textContent = box.label;

            // Add click event listener to toggle the transparent class on the box
            listItem.addEventListener('click', () => toggleBoxTransparency(box));

            labelList.appendChild(listItem);

        }
    } else {
        const labelList = document.getElementById('label-list');
        labelList.innerHTML = '';
    }
    // Add double-click event listener to label list items
    const labelListItems = document.querySelectorAll('#label-list li');

    labelListItems.forEach(item => {
        item.addEventListener('dblclick', () => setCurrentBoxByLabel(item.textContent));
    });

}


// Function to toggle the transparent class on the box
function toggleBoxTransparency(box) {
    const boxElements = imageContainer.getElementsByClassName('box');
    for (const boxElement of boxElements) {
        console.log(parseFloat(boxElement.style.left), box.left);
        if (parseFloat(boxElement.style.left).toFixed(2) === (box.left).toFixed(2) &&
            parseFloat(boxElement.style.top).toFixed(2) === (box.top).toFixed(2)) {
            boxElement.classList.toggle('transparent-box');

            currentBox = boxElement;

            // Check if the box should have resize handles
            if (boxElement.classList.contains('transparent-box')) {
                createBoxElementEdit(boxElement);
            } else {
                removeBoxElementEdit(boxElement);
            }
        } else {
            boxElement.classList.remove('transparent-box');
            removeBoxElementEdit(boxElement);
        }
    }
}


function toggleBoxTransparencyEvent(box) {
    const boxElements = imageContainer.getElementsByClassName('box');
    for (const boxElement of boxElements) {
        if (parseFloat(boxElement.style.left) === parseFloat(box.style.left) && parseFloat(boxElement.style.top) === parseFloat(box.style.top)) {
            boxElement.classList.toggle('transparent-box');
            currentBox = boxElement;

            // Check if the box should have resize handles
            if (boxElement.classList.contains('transparent-box')) {
                createBoxElementEdit(boxElement);
            } else {
                removeBoxElementEdit(boxElement);
            }
        } else {
            boxElement.classList.remove('transparent-box');
            removeBoxElementEdit(boxElement);
        }
    }
}

function removeBoxElementEdit(boxData) {
    const resizeHandles = boxData.querySelector('.resize-handles');
    if (resizeHandles) {
        boxData.removeChild(resizeHandles);
    }
}


// Function to edit the label
function editLabel() {
    if (imageDataArray[currentImageIndex]) {
        labelInputEdit.value = currentBox.label;
        labelInputEdit.style.display = 'block';
        labelInputEdit.focus();
        labelContainerEdit.style.display = 'block';

    } else {
        const labelList = document.getElementById('label-list');
        labelList.innerHTML = '';
    }
}

// Function to set the current box based on a label
function setCurrentBoxByLabel(label) {
    isLabelEntered = false; // Set the flag when a label is entered
    // Find the matching box index based on label
    const imageData = imageDataArray[currentImageIndex];
    const boxData = imageData.boxes.find(box => box.label === label);

    if (boxData) {
        currentBox = boxData;

        editLabel();

        // showCurrentImage(); // Update the displayed image to show the new current box
    }
}


function createBoxElementEdit(boxData) {

    // Create and append resizing handles
    const resizeHandles = createResizeHandles();
    boxData.appendChild(resizeHandles);
    // console.log(boxData);
    return boxData;
}

function createResizeHandles() {
    const resizeHandles = document.createElement('div');
    resizeHandles.className = 'resize-handles';

    const handlePositions = [
        'top-left', 'top-right', 'bottom-left', 'bottom-right'
    ];

    handlePositions.forEach(position => {
        const handle = document.createElement('div');
        handle.className = 'box-resize-handle box-' + position;
        resizeHandles.appendChild(handle);

        // Add mousedown event listener for resizing
        handle.addEventListener('mousedown', event => startResizing(event));

    });

    return resizeHandles;
}


// Function to start resizing
function startResizing(event) {
    // Clear drawing mode
    isStartDrawing = false;
    isStartResizing = true
    event.preventDefault();

    resizingHandle = event.target;
    // console.log(currentBox)
    initialBoxWidth = parseFloat(currentBox.style.width);
    initialBoxHeight = parseFloat(currentBox.style.height);
    initialMouseX = event.clientX - imageContainer.getBoundingClientRect().left;
    initialMouseY = event.clientY - imageContainer.getBoundingClientRect().top;

    selectedBox = currentBox;
    // console.log(parseFloat(currentBox.style.left), parseFloat(currentBox.style.top))
    newLeft = parseFloat(currentBox.style.left);
    newTop = parseFloat(currentBox.style.top);
}

// Function to resize the box
// Function to resize the box
function resizeBox(event) {
    if (isStartResizing) {
        isResizing = true;
        // console.log("startresizebox")
        // startX = event.clientX - imageContainer.getBoundingClientRect().left;
        // startY = event.clientY - imageContainer.getBoundingClientRect().top;

        const mouseX = event.clientX - imageContainer.getBoundingClientRect().left;
        const mouseY = event.clientY - imageContainer.getBoundingClientRect().top;
        const offsetX = mouseX - initialMouseX;
        const offsetY = mouseY - initialMouseY;

        // Calculate new dimensions based on resizing handle position
        let newWidth = initialBoxWidth;
        let newHeight = initialBoxHeight;

        // console.log(newLeft, newTop)

        if (resizingHandle.classList.contains('box-top-left')) {
            // console.log("startresizebox_1")
            newWidth -= offsetX;
            newHeight -= offsetY;
            newLeft += offsetX;
            newTop += offsetY;
        } else if (resizingHandle.classList.contains('box-top-right')) {

            // Calculate the new width and height of the box based on mouse movement
            // Add the mouse movement to the initial width and subtract from the height to adjust the box dimensions
            newWidth += offsetX;
            newHeight -= offsetY;

            // Calculate the new top position of the box
            // Add the mouse movement to the initial top position to adjust the box position
            newTop += offsetY;
        } else if (resizingHandle.classList.contains('box-bottom-left')) {
            // Calculate the new width and height of the box based on mouse movement
            // Subtract the mouse movement from the initial width and add to the height to adjust the box dimensions
            newWidth -= offsetX;
            newHeight += offsetY;

            // Calculate the new left position of the box
            // Add the mouse movement to the initial left position to adjust the box position
            newLeft += offsetX;
        } else if (resizingHandle.classList.contains('box-bottom-right')) {
            // console.log("resizebottomright")

            // Calculate the new width and height of the box based on mouse movement
            // Add the mouse movement to both the initial width and height to adjust the box dimensions
            newWidth += offsetX;
            newHeight += offsetY;
        }

        // Update box dimensions and position
        // console.log(newHeight, newWidth)
        // console.log(newLeft, newTop)
        currentBox.style.width = newWidth + 'px';
        currentBox.style.height = newHeight + 'px';
        currentBox.style.left = newLeft + 'px';
        currentBox.style.top = newTop + 'px';

        // console.log(imageDataArray[currentImageIndex].boxes)

        // Remove the selected box from imageDataArray if it exists
        if (selectedBox && selectedBox !== currentBox) {
            // Find the selected box in the imageDataArray and remove it
            const selectedBoxDataIndex = imageDataArray[currentImageIndex].boxes.findIndex(box => {
                return box.left === parseFloat(selectedBox.style.left) &&
                       box.top === parseFloat(selectedBox.style.top);
            });
            // console.log(imageDataArray[currentImageIndex])
            if (selectedBoxDataIndex !== -1) {
                selectedLabel =  imageDataArray[currentImageIndex].boxes[selectedBoxDataIndex].label

                imageDataArray[currentImageIndex].boxes.splice(selectedBoxDataIndex, 1);
            }
        }
        // console.log(imageDataArray[currentImageIndex].boxes)

        // Adjust the position of the label container based on the position of the box
        imageContainer.appendChild(currentBox);
        labelContainer.style.left = currentBox.style.left;
        labelContainer.style.top = currentBox.style.top;


        // Update initial values for the next movement
        initialBoxWidth = newWidth;
        initialBoxHeight = newHeight;
        initialMouseX = mouseX;
        initialMouseY = mouseY;

    }
}


// Function to stop resizing
function stopResizing() {
    if (isStartResizing && isResizing) {
        labelInput.style.display = 'block';
        labelInput.value = selectedLabel;
        labelInput.focus();
        labelContainer.style.display = 'block';

    }
    isStartResizing = false;
    isResizing = false;
}

// Remove the selected box from imageDataArray if it exists
function deleteSelectedBox() {
    // console.log("currentImageIndex", currentImageIndex);

    const selectedBoxDataIndex = imageDataArray[currentImageIndex].boxes.findIndex(box => {
                // console.log(parseFloat(currentBox.style.left), box.left);
                return (box.left).toFixed(2) === parseFloat(currentBox.style.left).toFixed(2) &&
                    (box.top).toFixed(2) === parseFloat(currentBox.style.top).toFixed(2);});
    // console.log(selectedBoxDataIndex);
    imageDataArray[currentImageIndex].boxes.splice(selectedBoxDataIndex, 1);
}

function saveCoordinates() {
    // Send the boxes array to the server (Python/Flask) for saving
    fetch('/save_coordinates', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(imageDataArray)
    }).then(response => {
        if (response.ok) {
            return response.json(); // Parse the response as JSON
        } else {
            alert('Failed to save coordinates.');
        }
    }).then(data => {
        // Get the link to the ZIP archive from the response
        const zipLink = data.zip_link;

        // Create a link element for downloading the ZIP archive
        const a = document.createElement('a');
        a.href = zipLink;
        a.download = 'xml_files.zip';

        // Append the link to the body and trigger the click event to start download
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a); // Clean up after download

    }).catch(error => {
        console.error('Error saving coordinates:', error);
        alert('An error occurred while saving coordinates.');
    });
}
