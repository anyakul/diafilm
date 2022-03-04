/**
 * @name aria
 * @version 1.0.0
 * @author Виктор Дмитриевцев <v.dmitrievcev@designdepot.ru>
 * @see git@git.designdepot.ru:frontend/aria.git
 * @license MIT
 */

(function ($) {
    'use strict';

    $.fn.aria = function (name, value) {
        if (arguments.length && arguments.length > 1) {
            return this.each(function () {
                $.attr(this, 'aria-' + name, value);
            });
        } else {
            return $.attr(this.get(0), 'aria-' + name);
        }
    };

    $.fn.removeAria = function (name) {
        return this.each(function () {
            $.removeAttr(this, 'aria-' + name);
        });
    };
}(jQuery));
