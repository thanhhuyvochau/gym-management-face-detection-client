const video = document.getElementById("video");

Promise.all([
  faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
]).then(startWebcam);

function startWebcam() {
  navigator.mediaDevices
    .getUserMedia({
      video: true,
      audio: false,
    })
    .then((stream) => {
      video.srcObject = stream;
    })
    .catch((error) => {
      console.error(error);
    });
}

let faceDetected = false;
let captureTimeout;

video.addEventListener("play", async () => {
  const canvas = faceapi.createCanvasFromMedia(video);
  document.body.append(canvas);

  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);

  setInterval(async () => {
    const detections = await faceapi.detectAllFaces(video).withFaceLandmarks();

    const resizedDetections = faceapi.resizeResults(detections, displaySize);

    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

    if (resizedDetections.length > 0) {
      if (!faceDetected) {
        faceDetected = true;
        captureTimeout = setTimeout(() => {
          captureImageAndSend(resizedDetections[0]);
        }, 2000); // Capture image after 2 seconds of continuous face detection
      }
    } else {
      faceDetected = false;
      clearTimeout(captureTimeout);
    }

    resizedDetections.forEach((detection) => {
      const box = detection.detection.box;
      const drawBox = new faceapi.draw.DrawBox(box, { label: "Face" });
      drawBox.draw(canvas);
    });
  }, 100);
});

function captureImageAndSend(detection) {
  // Capture the image (you may need to adapt this part based on your requirements)
  const canvas = faceapi.createCanvasFromMedia(video);
  const context = canvas.getContext("2d");
  context.drawImage(video, 0, 0, video.width, video.height);
  const capturedImage = canvas.toDataURL("image/jpeg");

  // Convert base64 to Blob
  const byteCharacters = atob(capturedImage.split(',')[1]);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'image/jpeg' });

  // Create FormData and append the image
  const formData = new FormData();
  formData.append('imageRequest', blob, 'image.jpg');

  // Send the captured image with a POST request as multipart
  fetch('http://localhost:8080/api/members/process-face', {
    method: 'POST',
    body: formData,
  })
  .then(response => response.json())
  .then(data => {
    console.log('Image sent successfully:', data);
  })
  .catch(error => {
    console.error('Error sending image:', error);
  });
}

