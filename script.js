document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("imageInput");
  const imagePreviewContainer = document.getElementById(
    "imagePreviewContainer"
  );
  const processButton = document.getElementById("processButton");
  const positionSelectWrapper = document.getElementById(
    "positionSelectWrapper"
  );
  const customPositionWrapper = document.getElementById(
    "customPositionWrapper"
  );
  const watermarkSrc = "assets/logo_btn.png";
  const selectedFiles = new Map(); // Lưu trữ file đã chọn theo thứ tự

  // Nút Clear
  const clearButton = document.getElementById("clearButton");

  clearButton.addEventListener("click", clearSelectedImages);

  // Radio buttons
  const watermarkOptionRadios = document.getElementsByName("watermarkOption");

  watermarkOptionRadios.forEach((radio) =>
    radio.addEventListener("change", handleWatermarkOptionChange)
  );

  fileInput.addEventListener("change", handleFileSelect);
  processButton.addEventListener("click", processImages);

  function handleWatermarkOptionChange() {
    const selectedOption = document.querySelector(
      'input[name="watermarkOption"]:checked'
    ).value;

    if (selectedOption === "position") {
      positionSelectWrapper.style.display = "block";
      customPositionWrapper.style.display = "none";
    } else if (selectedOption === "custom") {
      positionSelectWrapper.style.display = "none";
      customPositionWrapper.style.display = "block";
    }
  }

  function handleFileSelect(event) {
    // Hiển thị loading khi chọn ảnh
    document.getElementById("loading").style.display = "flex";

    const files = event.target.files;
    Array.from(files).forEach((file) => {
      if (!selectedFiles.has(file.name)) {
        selectedFiles.set(file.name, file);
        displayImage(file);
      }
    });

    // Ẩn loading sau khi ảnh được chọn
    setTimeout(() => {
      document.getElementById("loading").style.display = "none";
    }, 1000); // Giả lập thời gian tải ảnh
  }

  function displayImage(file) {
    const reader = new FileReader();
    const previewElement = document.createElement("div");
    previewElement.className = "image-preview";

    reader.onload = (event) => {
      previewElement.innerHTML = `
              <img src="${event.target.result}" alt="${file.name}">
              <button data-file="${file.name}">&times;</button>
            `;

      previewElement.querySelector("button").addEventListener("click", (e) => {
        const fileName = e.target.dataset.file;
        selectedFiles.delete(fileName);
        previewElement.remove();
      });

      imagePreviewContainer.appendChild(previewElement);
    };

    reader.readAsDataURL(file);
  }

  function clearSelectedImages() {
    // Xóa các ảnh đã chọn trong Map
    selectedFiles.clear();

    // Xóa tất cả các preview ảnh hiển thị
    imagePreviewContainer.innerHTML = "";

    // Reset lại giá trị của input file
    fileInput.value = "";
  }

  async function processImages() {
    // Hiển thị loading khi bắt đầu xử lý
    document.getElementById("loading").style.display = "flex";

    if (selectedFiles.size === 0) {
      alert("Vui lòng chọn ít nhất một hình ảnh!");
      document.getElementById("loading").style.display = "none";
      return;
    }

    const watermarkImg = await loadImageFromUrl(watermarkSrc);
    const zip = new JSZip();

    for (let [fileName, file] of selectedFiles) {
      const img = await loadImageFromFile(file);
      const watermarkedImg = addWatermark(img, watermarkImg);
      const dataURL = watermarkedImg.toDataURL("image/jpeg");
      zip.file(fileName, dataURL.split(",")[1], { base64: true });
    }

    zip.generateAsync({ type: "blob" }).then((blob) => {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "watermarked_images.zip";
      link.click();

      // Ẩn loading sau khi xử lý xong
      document.getElementById("loading").style.display = "none";
    });
  }

  function loadImageFromUrl(url) {
    return new Promise((resolve, reject) => {
      window.loadImage(
        url,
        (img) => {
          if (img.type === "error") {
            reject("Không thể tải watermark.");
          } else {
            resolve(img);
          }
        },
        { crossOrigin: "anonymous" }
      );
    });
  }

  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      window.loadImage(
        file,
        (img) => {
          if (img.type === "error") {
            reject("Không thể tải ảnh.");
          } else {
            resolve(img);
          }
        },
        { canvas: true, orientation: true }
      );
    });
  }

  function addWatermark(img, watermarkImg) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = img.width;
    canvas.height = img.height;

    ctx.drawImage(img, 0, 0);

    const position = getWatermarkPosition(img, watermarkImg);

    ctx.globalAlpha = 0.5;
    ctx.drawImage(
      watermarkImg,
      position.x,
      position.y,
      position.width,
      position.height
    );

    return canvas;
  }

  function getWatermarkPosition(img, watermarkImg) {
    const selectedOption = document.querySelector(
      'input[name="watermarkOption"]:checked'
    ).value;

    const watermarkWidth = img.width * 0.2;
    const watermarkHeight =
      (watermarkImg.height / watermarkImg.width) * watermarkWidth;

    if (selectedOption === "custom") {
      const customPosition = document
        .getElementById("customPosition")
        .value.trim();
      const [x, y] = customPosition.split(",").map(Number);
      return {
        x: x || 0,
        y: y || 0,
        width: watermarkWidth,
        height: watermarkHeight,
      };
    }

    let x = 0,
      y = 0;
    const positionSelect = document.getElementById("positionSelect").value;

    switch (positionSelect) {
      case "top-left":
        x = 10;
        y = 10;
        break;
      case "top-right":
        x = img.width - watermarkWidth - 10;
        y = 10;
        break;
      case "bottom-left":
        x = 10;
        y = img.height - watermarkHeight - 10;
        break;
      case "bottom-right":
      default:
        x = img.width - watermarkWidth - 10;
        y = img.height - watermarkHeight - 10;
        break;
    }

    return { x, y, width: watermarkWidth, height: watermarkHeight };
  }
});
