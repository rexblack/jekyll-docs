(function ( $, window) {
  
  var defaults = {
    duration: 500, 
    queue: false, 
    offset: {
      left: 0, 
      top: 0
    }
  };
  
  function scrollInteractionHandler() {
    var element = this == window ? $('html, body') : this;
    $(element).stop();
  }
  
  function scrollTo(x, y, options) {
    
    // console.log("SCROLL TO: ", x, y);
    
    var element = this[0] == window ? $('html, body') : this;
    var containerOffset = element.offset();

    var a = arguments;
    var object = a[0] instanceof jQuery ? a[0][0] : a[0];
    
    if (typeof object == 'object' && object != null) {
      options = a[1];
      if (object.nodeType == 1) {
        // get element's position
        var elemOffset = $(object).offset();
        x = Math.ceil(elemOffset.left) - containerOffset.left;
        y = Math.ceil(elemOffset.top) - containerOffset.top;
      } else {
        x = object.x || object.left;
        y = object.y || object.top;
      }
    }

    options = $.extend(true, {}, defaults, options);
    if (typeof object == 'undefined' || object == null) {
      return null;
    }
    
    var offset = options.offset;
    x-= offset.left;
    y-= offset.top;
    delete options.offset;
    
    $(this).unbind('onmousewheel DOMMouseScroll touchmove', scrollInteractionHandler);
    $(this).bind('onmousewheel DOMMouseScroll touchmove', scrollInteractionHandler);
    
    var complete = options.complete;
    options.complete = function() {
      $(element).unbind('onmousewheel DOMMouseScroll touchmove', scrollInteractionHandler);
      if (typeof complete == 'function') complete.apply(this, arguments);
    };
    
    $(element).animate({
      scrollTop: y, 
      scrollLeft: x
    }, options);
    
  };
  
  
  $.fn['scrollTo'] = scrollTo;
  
  
  

})( jQuery, window );