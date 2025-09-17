# project2 - GIFフレームビューア

project2 は、ユーザーが GIF ファイルを読み込むと、その GIF に含まれるすべてのフレームを一覧表示するシンプルな Web アプリです。最新の Chromium ベースブラウザに搭載された [ImageDecoder API](https://developer.mozilla.org/docs/Web/API/ImageDecoder) を利用しているため、追加のライブラリなしで高速にフレームを抽出できます。

## 使い方

1. `index.html` をブラウザで開きます。
2. 「GIFファイルを選択」ボタンから任意の GIF を選択します。
3. ファイルの解析が完了すると、すべてのフレームがグリッド状に表示されます。

## 注意事項

- ImageDecoder API が有効な最新の Chrome / Edge / Opera などでの利用を想定しています。
- API をサポートしていないブラウザではエラーメッセージが表示されます。
- 抽出された各フレームは PNG 画像として表示され、長押しや右クリックで保存できます。
