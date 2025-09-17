(function () {
  const fileInput = document.getElementById("gifInput");
  const framesContainer = document.getElementById("frames");
  const statusLabel = document.getElementById("status");

  function resetView(message) {
    framesContainer.innerHTML = "";
    statusLabel.textContent = message;
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      resetView("ファイルを選択してください。");
      return;
    }

    if (file.type !== "image/gif") {
      resetView("GIF 形式のファイルを選択してください。");
      return;
    }

    resetView("読み込み中です…");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const gif = gifuct.parseGIF(arrayBuffer);
      const frames = gifuct.decompressFrames(gif, true);

      if (!frames.length) {
        resetView("フレームを取得できませんでした。");
        return;
      }

      framesContainer.innerHTML = "";
      statusLabel.textContent = `${frames.length} フレーム見つかりました。`;

      frames.forEach((frame, index) => {
        const card = document.createElement("article");
        card.className = "frame-card";

        const canvas = document.createElement("canvas");
        const width = gif.lsd.width;
        const height = gif.lsd.height;
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");
        if (!context) {
          return;
        }

        const imageData = context.createImageData(width, height);
        imageData.data.set(frame.patch);
        context.putImageData(imageData, 0, 0);

        const caption = document.createElement("span");
        caption.className = "frame-index";
        const delay = frame.delay ? (frame.delay * 10) : 0; // delay is in hundredths of a second
        caption.textContent = `フレーム ${index + 1} / 遅延 ${delay}ms`;

        card.appendChild(canvas);
        card.appendChild(caption);
        framesContainer.appendChild(card);
      });
    } catch (error) {
      console.error(error);
      resetView("読み込みに失敗しました。別の GIF を試してください。");
    }
  }

  fileInput.addEventListener("change", handleFileChange);
})();
