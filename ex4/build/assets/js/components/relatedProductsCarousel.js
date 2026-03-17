function getTrackGap(track) {
  const styles = window.getComputedStyle(track);
  const rawGap = styles.columnGap || styles.gap || "0";
  const parsedGap = Number.parseFloat(rawGap);
  return Number.isFinite(parsedGap) ? parsedGap : 0;
}

function getStepWidth(track, item) {
  if (!item) {
    return 0;
  }

  return item.getBoundingClientRect().width + getTrackGap(track);
}

export function createRelatedProductsCarousel({
  root,
  viewport,
  track,
  prevButton,
  nextButton,
  desktopItemsPerView = 4,
}) {
  if (!root || !viewport || !track) {
    return {
      destroy() {},
    };
  }

  const previousClones = track.querySelectorAll('[data-related-clone="true"]');
  previousClones.forEach((item) => item.remove());

  const originalItems = Array.from(track.querySelectorAll(".js-related-item"));
  if (originalItems.length === 0) {
    return {
      destroy() {},
    };
  }

  const cloneCount = Math.min(desktopItemsPerView, originalItems.length);
  originalItems.slice(0, cloneCount).forEach((item) => {
    const clone = item.cloneNode(true);
    clone.setAttribute("data-related-clone", "true");
    clone.addEventListener("click", () => {
      const productId = clone.getAttribute("data-product-id");
      const originalItem = originalItems.find(
        (candidate) => candidate.getAttribute("data-product-id") === productId,
      );
      originalItem?.click();
    });
    track.appendChild(clone);
  });

  let isAdjustingLoop = false;
  let isMouseDown = false;
  let hasDragged = false;
  let pointerStartX = 0;
  let scrollStartLeft = 0;

  const firstClone = track.querySelector('[data-related-clone="true"]');

  function getLoopStart() {
    if (!firstClone) {
      return 0;
    }

    return firstClone.offsetLeft;
  }

  function getLoopBoundary() {
    const loopStart = getLoopStart();
    const maxScrollLeft = Math.max(
      0,
      viewport.scrollWidth - viewport.clientWidth,
    );

    if (!loopStart) {
      return maxScrollLeft;
    }

    return Math.min(loopStart, maxScrollLeft);
  }

  function normalizeLoopPosition() {
    // isAdjustingLoop is true during both forward and backward teleports, so
    // scroll events fired by our own scrollLeft assignments are ignored here.
    if (isAdjustingLoop) {
      return;
    }

    const loopBoundary = getLoopBoundary();
    if (!loopBoundary) {
      return;
    }

    // Forward wrap: when the user has scrolled past the clone zone, snap
    // instantly back to scrollLeft=0 (which shows identical content).
    if (viewport.scrollLeft >= loopBoundary - 1) {
      isAdjustingLoop = true;
      viewport.scrollLeft = 0;
      isAdjustingLoop = false;
    }
  }

  function handleMouseDown(event) {
    if (event.button !== 0) {
      return;
    }

    isMouseDown = true;
    hasDragged = false;
    pointerStartX = event.clientX;
    scrollStartLeft = viewport.scrollLeft;
    viewport.classList.add("is-dragging");
  }

  function handleMouseMove(event) {
    if (!isMouseDown) {
      return;
    }

    const deltaX = event.clientX - pointerStartX;
    if (Math.abs(deltaX) > 3) {
      hasDragged = true;
    }

    viewport.scrollLeft = scrollStartLeft - deltaX;
    normalizeLoopPosition();
  }

  function handleMouseUp() {
    if (!isMouseDown) {
      return;
    }

    isMouseDown = false;
    viewport.classList.remove("is-dragging");
  }

  function handleTrackClick(event) {
    if (!hasDragged) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    hasDragged = false;
  }

  function scrollByStep(direction) {
    const firstOriginal = originalItems[0];
    const step = getStepWidth(track, firstOriginal);
    if (!step) {
      return;
    }

    if (direction === -1) {
      // Backward wrap is needed when there is not enough scroll room to the left.
      // scrollLeft <= 0 catches the hard-stop at the start;
      // scrollLeft < step catches being close enough that scrollBy would clamp.
      const needsWrap = viewport.scrollLeft <= 0 || viewport.scrollLeft < step;
      const loopBoundary = needsWrap ? getLoopBoundary() : 0;

      if (needsWrap && loopBoundary) {
        // Smooth scroll after teleport is not reliable here: some browsers may
        // still base scrollBy on the stale pre-teleport position (often 0),
        // causing the value to clamp back to 0 and leaving the carousel stuck.
        // A single direct assignment is deterministic and timing-independent.
        // loopBoundary - step lands on the last real item position immediately.
        isAdjustingLoop = true;
        viewport.scrollLeft = loopBoundary - step;
        isAdjustingLoop = false;
        return;
      }
    }

    viewport.scrollBy({
      left: direction * step,
      behavior: "smooth",
    });
  }

  function handleWheel(event) {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
      return;
    }

    event.preventDefault();
    viewport.scrollBy({
      left: event.deltaY,
    });
    normalizeLoopPosition();
  }

  viewport.addEventListener("scroll", normalizeLoopPosition);
  viewport.addEventListener("mousedown", handleMouseDown);
  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mouseup", handleMouseUp);
  track.addEventListener("click", handleTrackClick, true);
  viewport.addEventListener("wheel", handleWheel, { passive: false });

  const handlePrevClick = () => {
    scrollByStep(-1);
  };

  const handleNextClick = () => {
    scrollByStep(1);
  };

  prevButton?.addEventListener("click", handlePrevClick);
  nextButton?.addEventListener("click", handleNextClick);

  viewport.scrollLeft = 0;

  return {
    destroy() {
      viewport.removeEventListener("scroll", normalizeLoopPosition);
      viewport.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      track.removeEventListener("click", handleTrackClick, true);
      viewport.removeEventListener("wheel", handleWheel);
      prevButton?.removeEventListener("click", handlePrevClick);
      nextButton?.removeEventListener("click", handleNextClick);

      const clonedItems = track.querySelectorAll('[data-related-clone="true"]');
      clonedItems.forEach((item) => item.remove());
      viewport.classList.remove("is-dragging");
    },
  };
}
