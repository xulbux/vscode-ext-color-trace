// Rust test fixture for Color Trace

fn main() {
    let brand_color = "#9670FF";
    let dark_mode_bg = "rgb(25, 15, 42)";
    let transparent_white = "rgba(255, 255, 255, 0.1)";

    // Named colors like red or green shouldn't highlight in Rust.
    let name = "red";

    println!("Our brand color is {} on background {}", brand_color, dark_mode_bg);
}
