require 'redcarpet'
require 'albino'

# class AlbinoMarkdown < Redcarpet::Render::HTML
  # def block_code(code, lang)
    # puts '******** BLOCK CODE'
    # code = Albino.safe_colorize(code, lang.downcase)
    # code.sub(/<pre>/, "<pre><code class=\"#{lang}\">").sub(/<\/pre>/, "</code></pre>")
    # code
  # end
# 
# end

class HTMLwithAlbino < Redcarpet::Render::HTML
  def block_code(code, language)
    puts 'exec'
    Albino.colorize(code, language)
  end
end

module Jekyll
  class MarkdownConverter
    def convert(content)
      config = Jekyll.configuration({})
      extensions = Hash[ *config["redcarpet"]["extensions"].map {|e| [e.to_sym, true] }.flatten ]
      markdown = Redcarpet::Markdown.new(HTMLwithAlbino, extensions)
      markdown.render(content)
    end
  end
end