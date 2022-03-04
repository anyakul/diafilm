(function ($) {
    $(function () {
        $('[loading="lazy"]').trigger('lazy:load');

        $('video').each(function (i, player) {
            player.pause();
            player.currentTime = 0;

            player.onplay = function () {
                player.pause();
                player.currentTime = 0;
            };
        });
    });
})(jQuery);
