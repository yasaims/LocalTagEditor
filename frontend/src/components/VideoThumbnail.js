import React from "react";

// Renders a video's first frame as a static thumbnail: no controls, no
// autoplay/download of the full file (preload="metadata"), seeked to a
// moment just past 0 via a #t= media fragment so the poster frame isn't
// black. muted + playsInline are needed for some mobile browsers to paint
// that frame at all.
function VideoThumbnail({ src, style, width, ariaLabel }) {
  return (
    <video
      src={`${src}#t=0.1`}
      preload="metadata"
      muted
      playsInline
      aria-label={ariaLabel}
      style={style}
      width={width}
    />
  );
}

export default VideoThumbnail;
