(function($, window) {

  var $window = $(window);
  var pluginName = 'pygxample';
  
  var defaults = {
    wrap: '<div class="highlight highlight-example"><div class="hll"></div></div>', 
    executes: ['html', 'js', 'css'], 
    errors: 'none', 
    iframe: false, 
    updateInterval: 500
  };
  
  function isAbsoluteUrl(url) {
    return url.match(/^\w*\:/);
  }
  
  // adds hostname to root-relative url
  function canonicalUrl(url) {
    if (!url) {
      return null;
    }
    if (url.match(/^\w*\:/)) {
      // absolute url
      return url;
    }
    var domain = window.location.protocol + "//" + window.location.host;
    var pathname = window.location.pathname;
    if (url.indexOf("/") == 0) {
      // root-relative url
      return domain + url;
    }
    // relative url
    return domain + "/" + pathname + url;
  }
  
  function dirName(path) {
    return path ? path.substring(0, path.lastIndexOf("/") + 1) : "";
  }
  
  function fileName(url) {
    return url ? url.split("/").pop() : null;
  }
  
  function fileExtension(url) {
    var filename = fileName(url);
    return filename.substring(filename.lastIndexOf(".") + 1);
  }
  
  // reports an error based on errors-setting
  function report(e, level) {
    switch (level) {
      case 'warn': 
        console.warn(e);
        return;
      case 'error': 
        console.error(e);
        return;
      case 'exception': 
        throw(e);
    }
  }
  
  var loadFile = (function() {
    
    var files = {};
    
    return function (src, callback, options) {
      
      // console.log("load file: ", src, callback, options);
      
      if (!src) {
        callback(null);
        return;
      }
      
      options = $.extend({type: "GET", async: true}, options);
      options.url = src;
      options.success = function(data) {
        $(files[src].callbacks).each(function() {
          this.call(self, data);
        });
        files[src] = data;
      }; 
      options.error = function() {
        $(files[src].callbacks).each(function() {
          this.call(self, null);
        });
        files[src] = null;
      };
      
      var self = this;
      var file = files[src];
      
      if (typeof file == 'string' || file === null) {
        callback.call(self, files[src]);
        return;
      }
      
      file = files[src] = files[src] || {callbacks: [], loading: false};
      file.callbacks.push(callback);
  
      if (file.loading) {
        return;
      }
      
      file.loading = true;
      
      $.ajax(options);
    };
  })();
  
  function parseHTML(string) {
    var doc = document.implementation.createHTMLDocument("");
    if (string.toLowerCase().indexOf('<!doctype') > -1) {
        doc.documentElement.innerHTML = string;
    } else {
        doc.body.innerHTML = string;
    }
    return doc;
  }
  
  function serializeHTML(doc) {
    result = doc.documentElement.outerHTML;
    return "<!DOCTYPE html>\n" + result;
  }
  
  function getCodeHtml(code, lang) {
    switch (lang) {
      case 'html': 
        return code;
      case 'css':
      case 'js':
        var tagName = lang == 'js' ? "script type=\"text/javascript\"" : "style";
        return "<" + tagName + ">\n" + code + "\n</" + tagName + ">";
    }
  }
  
  function getWrapperStyles(element, child) {
    var result = [];
    element = $(element);
    if (element[0] == child[0]) {
      return result;
    }
    result.push({element: element[0], className: element.attr('class'), style: element.attr('style')});
    element.children().each(function() {
      result = result.concat(getWrapperStyles(this, child));
    });
    return result;
  }
  
  function removeWrapperStyles(element, child) {
    element = $(element);
    if (element[0] == child[0]) {
      return;
    }
    element.removeAttr('class');
    element.removeAttr('style');
    element.children().each(function() {
      removeWrapperStyles(this, child);
    });
  }
  
  function restoreWrapperStyles(element, child, wrapperStyles) {
    element = $(element);
    if (element[0] == child[0]) {
      return;
    }
    $(wrapperStyles).each(function(index, obj) {
      if (element[0] == this.element) {
        $(this.element)
          .attr('class', obj.className)
          .attr('style', obj.style);
      }
    });
    element.children().each(function() {
      restoreWrapperStyles(this, child, wrapperStyles);
    });
  }
  
  function Pygxample(element, options) {
    
    var instance = this;
    var validatedContentHeight = -1;
    
    var contentElement = null;
    var wrapperElement = null;
    
    var wrapperStyles = [];
    var updateIntervalId = null;
    var contentSelector = null;
    
    this.getOption = function(name) {
      return options[name];
    };
    
    function init() {
      $(options.executes.map(function(lang) {
        return "*[data-lang='" + lang + "']";
      }).join(","), element).each(function() {
        var lang = options.lang = $(this).data('lang');
        var code = options.code = $(this).text();
      });
    }
    
    function resizeContent() {
      var resizeTarget = contentElement.prop('contentDocument') ? $(contentElement.prop('contentDocument')).find(contentSelector || "body") : contentElement;
      var contentHeight = resizeTarget.height();
      if (validatedContentHeight != contentHeight) {
        validatedContentHeight = contentHeight;
        if (contentHeight > 0) {
          if (contentElement.prop('contentDocument')) {
            // iframe
            contentElement.css({
              height: resizeTarget.outerHeight(true) + "px"
            }).parent().css({
              padding: 0
            });
          }
          restoreWrapperStyles(wrapperElement, contentElement, wrapperStyles);
        } else {
          removeWrapperStyles(wrapperElement, contentElement);
        }
      }
    }
    
    function renderIFrame() {
      
      contentElement = $('<iframe frameborder="0"> </iframe>').css({
        width: '100%', 
        height: 0, 
        display: 'block'
      });
      
      var wrap = $(options.wrap);
      contentElement.insertBefore(element);
      contentElement.wrap(wrap);
      
      wrapperElement = $(element.previousSibling);
      wrapperStyles = getWrapperStyles(wrapperElement, contentElement);
      
      // asset paths
      var pageAssets = $("link[rel='stylesheet'], script[src]", $('head')).map(function(obj) {
        return $(this).attr('href') || $(this).attr('src');
      }).toArray();
      var assets = $(options.assets).map(function(index, path) {
        return concatUrl(dirName(concatUrl(options.baseUrl, options.manifest)), path);
      }).toArray();
      var assets = pageAssets.concat(assets);
      
      // content html
      var contentHTML = "";
      var groupInstances = getGroupInstances(instance);
      $(groupInstances).each(function(index, obj) {
        var codeHtml = getCodeHtml(obj.getOption('code'), obj.getOption('lang'));
        var groupHtml = obj === instance ? codeHtml : '<div style="display: none">' + codeHtml + '</div>';
        contentHTML+= groupHtml;
      });
      var outer = $("<div></div>");
      var inner = $("<div></div>");
      outer.append(inner);
      inner.wrap(options.wrap);
      
      var wrapperElements = inner.parents().toArray();
      wrapperElements.pop();
      wrapperElements.reverse();
      var selector = "";
      var wrapperSelectors = $(wrapperElements).map(function(index, object) {
        return selector = (selector ? selector + " > " : "") + (index == 0 ? "body" : "") + "." + $(object).prop('className').split(/\s+/).join(".");
      }).toArray();
      var elem = outer.children().first();
      var parent = inner[0].parentNode;
      parent.innerHTML = contentHTML;
      var className = wrapperElements[0] ? $(wrapperElements[0]).prop('className') : "";
      contentHTML = elem.html();
      contentSelector = wrapperSelectors[wrapperSelectors.length - 1];
      // build html
      var html = "<!DOCTYPE html>\n";
      html+= "<html>";
      html+= "<head>";
      
      $(assets).each(function(index, url) {
        var type = url.substring(url.lastIndexOf(".") + 1);
        if (type == "js") {
          html+= '<script src="' + url + '"></script>'; 
        } else if (type == "css") {
          html+= '<link rel="stylesheet" href="' + url + '">';
        }
      });
      
      // override styles
      html+= "<style>";
      html+= 'body, html { border: none; margin: 0; padding: 0; border-radius: 0; }';
      for (var i = 0, selector; selector = wrapperSelectors[i]; i++) {
        var props = "margin: 0; border: 0; border-radius: 0;";
        if (wrapperSelectors[i + 1]) {
          props+= "padding: 0;"; 
        }
        
        html+= selector + ' { ' + props + ' }';
      }
      html+= "</style>";
      html+= "</head>";
      
      // body
      html+= '<body class="' + className + '">';
      html+= contentHTML;
      html+= "</body>";
      html+= "</html>";
      
      $(contentElement.prop('contentWindow')).on('load resize', resizeContent);
      
      // init update interval
      // if (options.updateInterval) {
        // window.clearInterval(updateIntervalId);
        // updateIntervalId = window.setInterval(resizeContent, options.updateInterval);
      // }

      var idoc = contentElement.prop('contentDocument');
      
      idoc.open();
      idoc.write(html);
      idoc.close();
      resizeContent();
    }
    
    function render() {
      
      if (!options.code) {
        return;
      }
      
      if (options.iframe) {
        renderIFrame();
      } else {
        contentElement = $("<div>" + getCodeHtml(options.code, options.lang) + "</div>");
        var wrap = $(options.wrap);
        contentElement.insertBefore(element);
        contentElement.wrap(wrap);
        
        wrapperElement = $(element.previousSibling);
        wrapperStyles = getWrapperStyles(wrapperElement, contentElement);
        
        // init update interval
        if (options.updateInterval) {
          window.clearInterval(updateIntervalId);
          updateIntervalId = window.setInterval(resizeContent, options.updateInterval);
        }
        
        resizeContent();
      }
      if (options.rendered) {
        options.rendered();
      }
    }
    
    this._render = render;
    
    init.call(this);
      
  }
  
  var pluginClass = Pygxample;
  var instances = [];
  
  function getGroupInstances(instance) {
    var group = instance.getOption('group');
    var result = [];
    $(instances).each(function(index, obj) {
      if (obj.getOption('group') === group) {
        result.push(obj);
      }
    });
    return result;
  }
  
  function concatUrl(baseUrl, path) {
    return path.match(/^\w*\:/) ? path : baseUrl + path;
  }
  
  function loadAssets(assets, callback) {
    var queue = assets.slice(); 
    var head = $('head');
    
    function next() {
      var url = queue.shift();
      if (url) {
        var contained = head.find("link[href='" + url + "'],script[src='" + url + "']").length > 0;
        if (contained) {
          next();
          return; 
        }
        var type = url.substring(url.lastIndexOf("."));
        var element;
        switch (type) {
          case '.js':
            element = document.createElement('script');
            $(element).one('load error', next);
            element.setAttribute('src', url);
            head[0].appendChild(element);
            break;
            
          case '.css':
            element = document.createElement('link');
            element.setAttribute('type', 'text/css');
            element.setAttribute('rel', 'stylesheet');
            element.setAttribute('href', url);
            head[0].appendChild(element);
            // link cannot detect load event
            next();
            break;
            
          default:
            next();
            
        }
      } else {
        if (callback) {
          callback();
        }
      }
    }
    next();

  }
  
  function watch(selector, callback) {
    // console.info("init watch: ", selector, callback);
  }
  
  function getAssetPath(options) {
    var manifestFile = concatUrl(options.baseUrl, options.manifest);
    return dirName(manifestFile);
  }
  
  $.fn[pluginName] = function(options) {
    
    var j = this;
    
    // console.log("init plugin: ", options);
    
    var newInstances = [];
    var group = options.group || {};
    
    options.baseUrl = options.baseUrl || dirName($('base').attr('href')) || window.location.protocol + "://" + window.location.host + window.location.pathname;
    options.baseUrl = options.baseUrl || "./"; 
    options.manifest = options.manifest || "";
    
    var manifestFile = concatUrl(options.baseUrl, options.manifest);
    var assetPath = dirName(manifestFile);
    
    loadFile(manifestFile, function(manifest) {
    
      if (manifest) {
        options = $.extend({}, defaults, manifest, options);
      }
      
      options.group = group;
      
      loadAssets(options.iframe ? [] : options.assets.map(function(path, index) {return concatUrl(assetPath, path);}), function() {
        
        // var watch = (function() {
          // watchIntervalId = setInterval(function() {
            // console.info("WATCH: ", document.readyState, $(j.selector));
            // if (document.readyState == "complete") {
              // clearInterval(watchIntervalId);
            // }
          // }, 1);
        // })();
        
        $(function() {
          
          j = $(j.selector);
          
          // collect group instances first
          
          j.each(function() {
        
            if (!$(this).data(pluginName)) {
              var instance = new pluginClass(this, $.extend({}, options));
              instances.push(instance);
              newInstances.push(instance);
              $(this).data(pluginName, instance);
            }
            
          });
          
          // then render all
          $(newInstances).each(function() {
            this._render();
          });
          
        });
        
      });
      
      
    }, {dataType: 'json', async: false});
    
    return this;
    
  };
  
})(jQuery, window);
