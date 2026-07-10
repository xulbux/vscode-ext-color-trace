# Python test fixture for Color Tracr


class Theme:
    PRIMARY = '#9670FF'
    SECONDARY = "#D270FF"
    BACKGROUND = "#1E1E1E"
    TEXT = "rgba(255, 255, 255, 0.8)"
    ACCENT = "hsl(12, 100%, 70%)"
    SUCCESS = "hwb(150 24% 15%)"

    BG_INT = 0x1E1E1E
    BG_TP_INT = 0x1E1E1E80

    def get_styles(self):
        return {"btn": "bg-[#F00] text-white", "error": "red"}
