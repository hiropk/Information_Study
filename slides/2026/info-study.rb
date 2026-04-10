include_theme("default")

# ============================================================
# カラー設定
# ============================================================
@foreground = "#1a202c"
@background = "#f7f9fc"

set_foreground(@foreground)
set_background(@background)

# ============================================================
# スライドタイトルの下線
# ============================================================
@default_headline_line_color  = "#3182ce"
@default_headline_line_width  = 3
@default_headline_line_expand = true

# ============================================================
# フォントサイズを match ブロックで直接指定
# ============================================================
SIZE = 18  # ← この数字を変えると全体が変わる（単位: pt）

match(Slide, HeadLine) do |headlines|
  headlines.prop_set("size", SIZE * 1.4)
  headlines.prop_set("foreground", "#2b6cb0")
  headlines.prop_set("weight", "bold")
end

match(TitleSlide, HeadLine) do |headlines|
  headlines.prop_set("size", SIZE * 1.5)
  headlines.prop_set("foreground", "#2b6cb0")
  headlines.prop_set("weight", "bold")
end

match(Slide, Body) do |bodies|
  bodies.prop_set("size", SIZE)
end

match(TitleSlide, Author) do |authors|
  authors.prop_set("size", SIZE * 0.9)
  authors.prop_set("foreground", "#4a5568")
end

match(TitleSlide, Date) do |dates|
  dates.prop_set("size", SIZE * 0.8)
  dates.prop_set("foreground", "#718096")
end
