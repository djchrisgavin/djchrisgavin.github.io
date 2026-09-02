(() => {
  const PROFILE_URL = 'https://soundcloud.com/djchrisgavin';

  const initRadio = () => {
    const iframe = document.getElementById('cg-radio-frame');
    const toggle = document.querySelector('[data-role="toggle"]');
    const next = document.querySelector('[data-role="next"]');
    const title = document.querySelector('[data-role="track-title"]');
    const source = document.querySelector('[data-role="source"]');

    if (!iframe || !toggle || !next || !title || typeof SC === 'undefined') return;

    const widget = SC.Widget(iframe);
    let sounds = [];
    let currentIndex = -1;
    let playing = false;
    let ready = false;

    const updateToggle = () => {
      toggle.textContent = playing ? 'PAUSE' : 'PLAY';
      toggle.setAttribute('aria-label', playing ? 'Pause Chris Gavin Radio' : 'Play Chris Gavin Radio');
    };

    const updateCurrentTrack = () => {
      widget.getCurrentSound((sound) => {
        if (!sound) return;
        title.textContent = (sound.title || 'CHRIS GAVIN RADIO').toUpperCase();
        title.title = sound.title || 'Chris Gavin Radio';
        if (source && sound.permalink_url) source.href = sound.permalink_url;
      });
      widget.getCurrentSoundIndex((index) => {
        currentIndex = typeof index === 'number' ? index : currentIndex;
      });
    };

    const randomIndex = () => {
      if (!sounds.length) return 0;
      if (sounds.length === 1) return 0;
      let index = Math.floor(Math.random() * sounds.length);
      if (index === currentIndex) index = (index + 1) % sounds.length;
      return index;
    };

    const playRandom = (autoplayAttempt = false) => {
      if (!ready) return;
      const index = randomIndex();
      currentIndex = index;
      widget.skip(index);
      window.setTimeout(() => {
        widget.play();
        if (!autoplayAttempt && typeof gtag === 'function') {
          gtag('event', 'radio_next', { item_name: 'Chris Gavin Radio' });
        }
      }, 120);
    };

    toggle.addEventListener('click', () => {
      if (!ready) return;
      widget.isPaused((paused) => {
        if (paused) {
          widget.play();
          if (typeof gtag === 'function') gtag('event', 'radio_play', { item_name: title.textContent });
        } else {
          widget.pause();
          if (typeof gtag === 'function') gtag('event', 'radio_pause', { item_name: title.textContent });
        }
      });
    });

    next.addEventListener('click', () => playRandom(false));

    widget.bind(SC.Widget.Events.READY, () => {
      ready = true;
      widget.setVolume(58);
      widget.getSounds((list) => {
        sounds = Array.isArray(list) ? list : [];
        const index = randomIndex();
        currentIndex = index;
        if (sounds.length) widget.skip(index);
        updateCurrentTrack();

        // Browsers may reject audible autoplay. We try once; the visible PLAY button is the fallback.
        window.setTimeout(() => widget.play(), 180);
      });
    });

    widget.bind(SC.Widget.Events.PLAY, () => {
      playing = true;
      updateToggle();
      updateCurrentTrack();
    });

    widget.bind(SC.Widget.Events.PAUSE, () => {
      playing = false;
      updateToggle();
    });

    widget.bind(SC.Widget.Events.FINISH, () => playRandom(true));

    widget.bind(SC.Widget.Events.ERROR, () => {
      title.textContent = 'RADIO UNAVAILABLE';
      playing = false;
      updateToggle();
    });

    window.setTimeout(() => {
      if (!playing) updateToggle();
    }, 1500);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRadio, { once: true });
  } else {
    initRadio();
  }
})();
