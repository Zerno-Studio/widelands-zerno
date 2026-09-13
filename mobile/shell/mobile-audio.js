// SDL owns the mixer and volume settings; this bridge only handles host lifecycle
// and the browser's requirement for a user gesture before audio can start.
(() => {
    let background = false;
    function syncAudio() {
        const context = window.Module?.SDL2?.audioContext;
        if (!context || context.state === 'closed') return;
        const pause = background || document.hidden;
        if (pause && context.state === 'running') {
            context.suspend().catch(() => {});
        } else if (!pause && context.state === 'suspended') {
            context.resume().catch(() => {});
        }
    }
    window.widelandsAudioBackground = value => {
        background = !!value;
        syncAudio();
    };
    document.addEventListener('visibilitychange', syncAudio);
    addEventListener('pointerdown', syncAudio, { capture: true, passive: true });
    addEventListener('keydown', syncAudio, { capture: true });
})();
