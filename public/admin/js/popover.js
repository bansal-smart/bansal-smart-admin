(function($) {
  'use strict';
  $(function() {
    
    if (typeof $.fn.popover.Constructor === 'undefined') {
      throw new Error('Bootstrap Popover must be included first!');
    }

    var Popover = $.fn.popover.Constructor;

    
    $.extend(Popover.Default, {
      customClass: ''
    });

    var _show = Popover.prototype.show;

    Popover.prototype.show = function() {

      
      _show.apply(this, Array.prototype.slice.apply(arguments));

      if (this.config.customClass) {
        var tip = this.getTipElement();
        $(tip).addClass(this.config.customClass);
      }

    };

    $('[data-toggle="popover"]').popover()
  });
})(jQuery);