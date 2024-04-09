let imageNames = [];
let images = [];
let originalImages = [];
let isImagesLoaded = false;
let currentImageIndex = 0;

const maxWidth = 2000;
const maxHeight = 2000;


let imageContainer = document.getElementById('image-container');


// Add event listener to the "Load Image" button
document.getElementById('load-image-button').addEventListener('click', loadImages);

// Add event listener to the file input for image loading
document.getElementById('image-input').addEventListener('change', previewImages);

// Add event listener to the run button
document.getElementById('run-all-button').addEventListener('click', processAndSendImages);

// change current image
let nextImageButton = document.getElementById('next-image-button');
let previousImageButton = document.getElementById('previous-image-button');


// Function to choose an image and show it in the image container
function loadImages() {
    document.getElementById('image-input').click();
    resultedImages.length = 0;
    resultedImageNames.length = 0;
    analysisTimeICrack = "None";
    iCrackProgress = "None";
    // const progressNane = document.getElementById("progress-name");
    // progressNane.style.display = "none";

    // const progressBar = document.getElementById("progress-bar");
    // progressBar.style.display = "none";
}


// Add event listener to the "Next Image" button
nextImageButton.addEventListener('click', () => {
        showNextImage();
});

// Add event listener to the "Previous Image" button
previousImageButton.addEventListener('click', () => {
        showPreviousImage();
});

const originalRadio = document.getElementById('checkShowOriginal');
const resultRadio = document.getElementById('checkShowResult');

originalRadio.addEventListener('change', function () {
    showCurrentImage();
    });

resultRadio.addEventListener('change', function () {
    showCurrentImage();
});

let scale = 1; // Initial scale factor
const scaleStep = 0.05; // Adjust the step size as needed

function handleMouseWheel(event) {
    if (event.ctrlKey) {
        // Prevent the default scroll behavior
        event.preventDefault();

        // Determine whether the user is scrolling up or down
        const delta = event.deltaY > 0 ? -1 : 1;

        // Update the scale factor based on the scroll direction and step size
        // console.log("delta", delta)
        const currentScale = scale + delta * scaleStep;

        // console.log("scale", currentScale)

        // Update the image's scale and position
        updateImageScale(event, currentScale);
    }

}

function updateImageScale(event, currentScale) {
    if (originalRadio.checked) {
        const image = images[currentImageIndex]; // Get the current image element
        const imageWidth = image.width * currentScale;
        const imageHeight = image.height * currentScale;

        // Apply the scale and translation to the image
        image.style.width = `${Math.min(Math.max(imageWidth, 200), 1000)}px`;
        image.style.height = `${Math.min(Math.max(imageHeight, 400), 2000)}px`;
    }
    if (resultRadio.checked) {
        const image = resultedImages[currentImageIndex]; // Get the current image element
        const imageWidth = image.width * currentScale;
        const imageHeight = image.height * currentScale;

        // Apply the scale and translation to the image
        image.style.width = `${Math.min(Math.max(imageWidth, 200), 1000)}px`;
        image.style.height = `${Math.min(Math.max(imageHeight, 400), 2000)}px`;
    }
}

imageContainer.addEventListener('wheel', handleMouseWheel);


// switch to previous image
function showPreviousImage() {
    currentImageIndex = currentImageIndex - 1;
    showCurrentImage();
}

// switch to next image
function showNextImage() {
    currentImageIndex = currentImageIndex + 1;
    showCurrentImage();
}


function displayAnalysisInfo() {
    // Get the elements by their IDs
    const imageCountElement = document.getElementById("image-count");
    const analysisTimeElement = document.getElementById("analysis-time");
    const progressElement = document.getElementById("progress");

    // Update the content of the elements
    imageCountElement.textContent = imageNames !== [] ? imageNames.length.toString() + " images" : "None";
    analysisTimeElement.textContent = analysisTimeICrack !== "None" ? analysisTimeICrack + " seconds" : analysisTimeICrack;
    progressElement.textContent = iCrackProgress;  // You can update this dynamically based on the progress of your analysis
}

// show image name list and the current image
function previewImages (event) {
    const files = event.target.files;

    imageNames.length = 0; // Clear the array
    images.length = 0; // Clear the array
    originalImages.length = 0;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();

        reader.onload = function () {
            const image = new Image();
            image.src = reader.result;
            image.onload = function () {
                // Create a deep copy of the original images
                const originalCopy = new Image();
                originalCopy.src = reader.result;
                // Update the image names list with the original file names
                // console.log(file)
                imageNames.push(file.name);
                images.push(image); // Push the loaded image to the images array
                originalImages.push(originalCopy); // Push the original image to the originalImages array

                if (imageNames.length === files.length) {
                    isImagesLoaded = true; // Mark images as loaded

                    // All images are loaded, display the first image
                    showImageNames();
                    showCurrentImage();
                    //  // Update the label information frame
                    // displayImageInfo();
                    alert("Load images is done");
                    displayAnalysisInfo();
                };
            };
        };
        if (file) {
            reader.readAsDataURL(file);
        }
    }
    // console.log(imageDataArray)

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


// show current image
function showCurrentImage() {

    // currentImageIndex = (currentImageIndex + 1) % images.length;
    currentImageIndex = currentImageIndex % images.length;

    if (originalRadio.checked) {
        const image = images[currentImageIndex];
        // Clear existing boxes and labels when switching to a new image
        imageContainer.innerHTML = '';
        imageContainer.appendChild(image);
        resizeImage(image);

        highlightSelectedImageName(); // highlight image name on the name list
    }
    if (resultRadio.checked) {
        if (resultedImages.length === 0) {
            imageContainer.innerHTML = 'Cannot find the result image. Please click "Run All" button.';
            highlightSelectedImageName(); // highlight image name on the name list
        }
        else {
            const currentOriginalImageName = imageNames[currentImageIndex];
            const resultedImageIndex = resultedImageNames.findIndex(imageName => imageName === currentOriginalImageName);
            const image = resultedImages[resultedImageIndex];
            // Clear existing boxes and labels when switching to a new image
            imageContainer.innerHTML = '';
            imageContainer.appendChild(image);
            resizeImage(image);

            highlightSelectedImageName(); // highlight image name on the name list
        }
    }

}

// switch to the selected image
function switchToImage(index) {
        currentImageIndex = index;
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
    // imageContainer.style.width = containerWidth + 'px';
    // imageContainer.style.height = containerHeight + 'px';

    // Set the image's dimensions to match the container's width
    // image.style.width = '100%';
    image.style.width = containerWidth + 'px';
    image.style.height = containerHeight + 'px';

    // Add a class to the image content for styling
    // image.classList.add('image-content');
    console.log("end", image.width, image.height);
    console.log("frame", imageContainer.style.width, imageContainer.style.height);
}


function resizeImage_old(image) {
    // Set the image's dimensions to match the container's width
    image.style.width = 800 + 'px';
    image.style.height = 800 + 'px';
    // image.class = 'object-fit-contain';

}

let analysisTimeICrack = "None";
let iCrackProgress = "None";
let startTimeICrack = new Date();

function displayProgressBar() {
    // Get the elements by their IDs
    // const analysisInfo = document.getElementById("analysis-info");
    // const progressName = document.createElement("h3");
    // progressName.textContent = "Progress Bar";
    // analysisInfo.appendChild(progressName);

    const progressNane = document.getElementById("progress-name");
    progressNane.style.display = "block";

    // Get the progress bar and progress bar fill elements
    const progressBar = document.getElementById("progress-bar-fill");

    // Calculate the maximum value based on the number of seconds
    const numberOfSeconds = imageNames.length * 8; // Change this value to the number of seconds you want
    const maxProgressValue = numberOfSeconds * 1000; // Convert seconds to milliseconds

    // Set the max attribute of the progress bar
    progressBar.parentElement.setAttribute("aria-valuemax", maxProgressValue.toString());


    // Function to update the progress bar value
    function updateProgressBar(value) {
        progressBar.style.width = (value / maxProgressValue) * 100 + "%";
        progressBar.setAttribute("aria-valuenow", value);
    }

    // Example: Update progress bar dynamically
    let currentTime = 0;
    const interval = 1000; // Update every second (1000 milliseconds)

    const progressInterval = setInterval(() => {
        currentTime += interval;
        updateProgressBar(currentTime);

        if (currentTime >= maxProgressValue) {
            clearInterval(progressInterval);
            console.log("Progress completed!");
        }
    }, interval);
}

// Send the loaded images to the server
function processAndSendImages() {
    displayProgressBar();
    startTimeICrack = new Date();
    if (!isImagesLoaded) {
        alert('Please load images first.');
        return;
    }

    // Create a FormData object to send images as a multipart/form-data request
    const formData = new FormData();

    // Add each image to the FormData object
    originalImages.forEach((image, index) => {
        const imageName = imageNames[index];
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
            formData.append('image[]', blob, imageName);
            if (index === images.length - 1) {
                // All images are added to FormData, send the request
                sendImagesToServer(formData);
            }
        }, 'image/jpeg');
    });

}


function sendImagesToServer(formData) {
    // Create an XMLHttpRequest object or use a modern fetch API
    const xhr = new XMLHttpRequest();

    // Define the server endpoint where you will handle image processing
    const serverEndpoint = '/process-images'; // Replace with your actual server endpoint

    xhr.open('POST', serverEndpoint, true);

    // Send the FormData with images to the server
    xhr.send(formData);

    // Handle the response from the server (if needed)
    xhr.onload = function () {
        if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            // Handle the server's response here if necessary
            console.log('Server response:', response);

            // Assuming that the server response contains the processed image URLs
            const processedImageUrls = response.processed_image_urls;

            // Display the processed images
            console.log('Processed images:', processedImageUrls);
            // displayProcessedImages(processedImageUrls);
            loadResultedImages(processedImageUrls);
        } else {
            console.error('Error:', xhr.status);
        }
    };

    // Send the FormData with images to the server
    // xhr.send(formData);
}


let resultedImages = [];
let resultedImageNames = [];
function loadResultedImages(resultedImageUrls) {
    // clear the resultedImages and resultedImageNames
    resultedImages.length = 0;
    resultedImageNames.length = 0;

    // Create a new Image object for each resulted image URL
    resultedImageUrls.forEach((imageUrl) => {
        const image = new Image();
        image.src = imageUrl;

        // When the image is loaded, add it to the resultedImages array
        image.onload = function () {
            resultedImages.push(image); // Push the loaded image to the resultedImages array
            // Push image name to resultedImageNames
            const imageUrlArray = imageUrl.split('/');
            resultedImageNames.push(imageUrlArray[imageUrlArray.length - 1]);

            // Check if all images have been loaded
            if (resultedImages.length === resultedImageUrls.length) {
                // All images have been loaded and added to resultedImages
                // You can perform any actions with the loaded images here
                console.log('All resulted images have been loaded:', resultedImages);
                let endTimeICrack = new Date();
                analysisTimeICrack = (endTimeICrack - startTimeICrack)/1000;
                iCrackProgress = "Done";
                displayAnalysisInfo();
            }
        };
    });
}

