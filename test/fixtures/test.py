# Python test fixture for Color Trace

# Named colors (like 'red' or 'tomato') shouldn't highlight here since it's not a
# CSS language, but standard hex and rgb values should highlight perfectly.


class Theme:
    PRIMARY = '#9670FF'
    SECONDARY = "#D270FF"
    BACKGROUND = "#1E1E1E"
    TEXT = "rgba(255, 255, 255, 0.8)"
    ACCENT = "hsl(21, 100%, 66%)"
    SUCCESS = "hwb(150 24% 15%)"

    BACKGROUND_INT = 0x1E1E1E

    def get_styles(self):
        return {"btn": "bg-[#F00] text-white", "error": "red"}
