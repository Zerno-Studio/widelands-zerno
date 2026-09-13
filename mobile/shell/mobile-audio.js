// SDL owns the mixer and volume settings; this bridge only handles host lifecycle
// and the browser's requirement for a user gesture before audio can start.
(() => {
    let background = false;
    let loading = 0;
    let settling = false;
    let resumeTimer;
    function syncAudio() {
        const context = window.Module?.SDL2?.audioContext;
        if (!context || context.state === 'closed') return;
        const pause = background || loading > 0 || settling || document.hidden;
        if (pause && context.state === 'running') {
            context.suspend().catch(() => {});
        } else if (!pause && context.state === 'suspended') {
            context.resume().catch(() => {});
        }
    }
    // Nested progress windows must all finish before audio can return. Defer
    // resumption beyond the synchronous transition and its final render.
    window.widelandsAudioLoading = delta => {
        loading = Math.max(0, loading + delta);
        clearTimeout(resumeTimer);
        settling = true;
        syncAudio();
        if (!loading) {
            resumeTimer = setTimeout(() => {
                settling = false;
                syncAudio();
            }, 250);
        }
    };
    window.widelandsAudioBackground = value => {
        background = !!value;
        syncAudio();
    };
    document.addEventListener('visibilitychange', syncAudio);
    addEventListener('pointerdown', syncAudio, { capture: true, passive: true });
    addEventListener('keydown', syncAudio, { capture: true });
})();
