const input = document.getElementById('gifInput');
const status = document.getElementById('status');
const framesContainer = document.getElementById('frames');

function resetView(message) {
  framesContainer.innerHTML = '';
  status.textContent = message;
}

async function decodeWithImageDecoder(file) {
  if (!('ImageDecoder' in window)) {
    throw new Error('このブラウザは ImageDecoder API をサポートしていません。');
  }

  const typeSupported = await ImageDecoder.isTypeSupported(file.type || 'image/gif');
  if (!typeSupported) {
    throw new Error('選択された GIF はこのブラウザではサポートされていません。');
  }

  const arrayBuffer = await file.arrayBuffer();
  const decoder = new ImageDecoder({ data: arrayBuffer, type: file.type || 'image/gif' });
  const { frameCount } = decoder.tracks.selectedTrack;

  if (!Number.isFinite(frameCount) || frameCount === 0) {
    decoder.close();
    throw new Error('フレームを取得できませんでした。');
  }

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const { image } = await decoder.decode({ frameIndex });
    const canvas = document.createElement('canvas');
    canvas.width = image.displayWidth;
    canvas.height = image.displayHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    image.close();

    const figure = document.createElement('figure');
    const img = document.createElement('img');
    img.src = canvas.toDataURL('image/png');
    img.alt = `フレーム ${frameIndex + 1}`;

    const caption = document.createElement('figcaption');
    caption.textContent = `フレーム ${frameIndex + 1}`;

    figure.appendChild(img);
    figure.appendChild(caption);
    framesContainer.appendChild(figure);
  }

  decoder.close();
  status.textContent = `合計 ${frameCount} フレームを表示しました。`;
}

input.addEventListener('change', async (event) => {
  const [file] = event.target.files;

  if (!file) {
    resetView('ファイルを選択してください。');
    return;
  }

  if (!(file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif'))) {
    resetView('GIF 形式のファイルを選択してください。');
    return;
  }

  resetView('解析中です…');

  try {
    await decodeWithImageDecoder(file);
  } catch (error) {
    console.error(error);
    resetView(error.message || 'フレームの抽出に失敗しました。');
    const help = document.createElement('p');
    help.className = 'status';
    help.textContent = 'Chromium ベースの最新ブラウザでお試しください。';
    framesContainer.appendChild(help);
  }
});
