(function($, window) {

  var $window = $(window);
  var pluginName = 'pagenav';
  
  var defaults = {
    content: '', 
    selector: 'h1,h2,h3,h4,h5,h6,h7', 
    processContent: true, 
    listTag: 'ul', 
    listClass: '', 
    itemTag: 'li', 
    itemClass: '', 
    flat: true, 
    maxLevel: 2
  };
  
  // https://gist.github.com/mathewbyrne/1280286
  function slugify(text) {
    return text.toString().toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[\.,-\/#!$%\^&\*;:{}=\-_`~()]/g,"-") // Replace punctuation with hyphens
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple hyphens with single hyphens
    .replace(/^-+/, '') // Trim hyphens from start of text
    .replace(/-+$/, ''); // Trim hyphens from end of text
  }
  
  function Pagenav(element, options) {
    
    var $element = $(element);
    
    function getContent(content) {
      switch (typeof content) {
        case 'string': 
          var $content = $(content);
          if ($content.length > 0) {
            return $content;
          }
          break;
      }
      return null;
    }
    
    function getMenuLevel(element) {
      var level = 0;
      if (level = element.tagName.match(/^h(\d)/i)[1]) {
        return parseInt(level);
      }
      return 1;
    }
    
    function getMenu(content) {
      var menu = {items: []};
      var parents = [menu];
      var level = 0;
      var ids = [];
      
      $(options.selector, content).each(function() {
        var itemLevel = getMenuLevel(this);
        
        if (options.maxLevel == 0 || itemLevel <= options.maxLevel) {
        
          var text = $(this).text();
          var id = $(this).attr('id');
          if (!id) {
            var name = slugify(text);
            id = name; 
            var c = 2;
            while(ids.indexOf(id) >= 0) {
              id = name + "-" + c;
              c++;
            }
            if (options.processContent) {
              $(this).attr('id', id);
            }
          }
          
          item = {
            title: text, 
            id: id, 
            items: []
          };
          
          ids.push(id);
          
          parents[itemLevel] = item;
  
          var parent = null, i = itemLevel;
          while(!(parent = parents[i - 1])) {
             i--;
          }
          
          parent.items.push(item);
          
          if (itemLevel < level) {
            parents = parents.slice(0, level);
          }
        }
        
        level = itemLevel;
      });
      
      if (options.flat && menu.items.length == 1) {
        menu = menu.items[0];
      }
      
      return menu;
    }
    
    function render(menu, options) {
      var listTag = options.listTag;
      var itemTag = options.itemTag;
      var ul = $('<' + options.listTag + ' class="' + options.listClass + '"></' + options.listTag + '>');
      for (var i = 0, item; item = menu.items[i]; i++) {
        var li = $('<' + options.itemTag + ' class="' + options.itemClass + '"><a href="#' + item.id + '">' + item.title + '</a></' + itemTag + '>');
        ul.append(li);
        if (item.items.length > 0) {
          var result = arguments.callee.call(this, item, options);
          li.append(result);
        }
      }
      return ul;
    };
    
    var content = getContent(options.content);
    
    
    
    var menu = getMenu();
    
    var $result = $(render.call(this, menu, options));
    console.info("result: ", $result);
    $element.html("");
    if ($result.prop('tagName').toUpperCase() == options.listTag.toUpperCase()) {
      console.log("SAME TAG", $result[0].childNodes);
      $element.addClass($result[0].className);
      $element.append($result.children());
    } else {
      $element.append($result);
    }
  }
  
  
  var pluginClass = Pagenav;

  // register plugin
  $.fn[pluginName] = function(options) {
    return this.each(function() {
      if (!$(this).data(pluginName)) {
        $(this).data(pluginName, new pluginClass(this, $.extend({}, defaults, options)));
      }
      return $(this);
    });
  };
  
  
})(jQuery, window);
