class ImageIndex {
    static properties() {
        return ["r", "g", "b", "a"];
    }
    constructor(x, y, width) {
        this.r = (x + y * width) * 4;
        this.g = this.r + 1;
        this.b = this.g + 1;
        this.a = this.b + 1;
    }
}
class ImageInterpolator {

    static nearestNeighbor(data, srcWidth, srcHeight, dstWidth, dstHeight) {
        const result = new Array(dstWidth * dstHeight);
        const ratioX = dstWidth / srcWidth;
        const ratioY = dstHeight / srcHeight;
        for (let x = 0; x < dstWidth; ++x) {
            const i = Math.floor(x / ratioX + 0.5);
            for (let y = 0; y < dstHeight; ++y) {
                const j = Math.floor(y / ratioY + 0.5);
                const srcIndex = new ImageIndex(i, j, srcWidth);
                const dstIndex = new ImageIndex(x, y, dstWidth);
                result[dstIndex.r] = data[srcIndex.r];
                result[dstIndex.g] = data[srcIndex.g];
                result[dstIndex.b] = data[srcIndex.b];
                result[dstIndex.a] = data[srcIndex.a];
            }
        }
        return result;
    }

    static bilinear(data, srcWidth, srcHeight, dstWidth, dstHeight) {
        const result = new Array(dstWidth * dstHeight);
        const ratioX = dstWidth / srcWidth;
        const ratioY = dstHeight / srcHeight;
        for (let x = 0; x < dstWidth; ++x) {
            const mx = x / ratioX;
            const x0 = Math.floor(mx);
            const x1 = Math.ceil(mx);
            const dx = mx - x0;
            for (let y = 0; y < dstHeight; ++y) {
                const my = y / ratioY;
                const y0 = Math.floor(my);
                const y1 = Math.ceil(my);
                const dy = my - y0;
                const srcIndex00 = new ImageIndex(x0, y0, srcWidth);
                const srcIndex01 = new ImageIndex(x0, y1, srcWidth);
                const srcIndex10 = new ImageIndex(x1, y0, srcWidth);
                const srcIndex11 = new ImageIndex(x1, y1, srcWidth);
                const dstIndex = new ImageIndex(x, y, dstWidth);
                for (const property of ImageIndex.properties()) {
                    result[dstIndex[property]] =
                        (1 - dx) * (1 - dy) * data[srcIndex00[property]] +
                        (1 - dx) * dy * data[srcIndex01[property]] +
                        dx * (1 - dy) * data[srcIndex10[property]] +
                        dx * dy * data[srcIndex11[property]]
                }
            }
        }
        return result;
    }

    static bicubic(data, srcWidth, srcHeight, dstWidth, dstHeight, a = -1) {
        const weight = (t) => {
            const abst = Math.abs(t);
            if (abst <= 1) {
                return (a + 2) * abst * abst * abst - (a + 3) * abst * abst + 1;
            } else if (abst <= 2) {
                return (a * abst * abst * abst) - 5 * a * abst * abst + 8 * a * abst - 4 * a;
            }
            return 0;
        }
        const result = new Array(dstWidth * dstHeight);
        const ratioX = dstWidth / srcWidth;
        const ratioY = dstHeight / srcHeight;
        for (let x = 0; x < dstWidth; ++x) {
            const mx = x / ratioX;
            const x0 = Math.floor(mx) - 1;
            for (let y = 0; y < dstHeight; ++y) {
                const my = y / ratioY;
                const y0 = Math.floor(my) - 1;
                const pixel = {
                    r: 0,
                    g: 0,
                    b: 0,
                    a: 0
                };
                for (let i = 0; i < 4; ++i) {
                    const xi = x0 + i;
                    if (xi < 0 || srcWidth <= xi) {
                        continue;
                    }
                    const dx = Math.abs(mx - xi);
                    const wx = weight(dx);
                    for (let j = 0; j < 4; ++j) {
                        const yj = y0 + j;
                        if (yj < 0 || srcHeight <= yj) {
                            continue;
                        }
                        const dy = Math.abs(my - yj);
                        const wy = weight(dy);
                        const srcIndex = new ImageIndex(xi, yj, srcWidth);
                        for (const property of ImageIndex.properties()) {
                            pixel[property] += data[srcIndex[property]] * wx * wy;
                        }
                    }
                }
                const dstIndex = new ImageIndex(x, y, dstWidth);
                for (const property of ImageIndex.properties()) {
                    result[dstIndex[property]] = pixel[property];
                }
            }
        }
        return result;
    }

    static lanczos(data, srcWidth, srcHeight, dstWidth, dstHeight, n = 3) {
        const sinc = (x) => {
            if (x === 0) {
                return 1;
            }
            return Math.sin(Math.PI * x) / (Math.PI * x);
        };
        const weight = (dx) => {
            if (n <= Math.abs(dx)) {
                return 0;
            }
            return sinc(dx) * sinc(dx / n);
        }
        const result = new Array(dstWidth *
            dstHeight);
        const ratioX = dstWidth / srcWidth;
        const ratioY = dstHeight / srcHeight;
        for (let x = 0; x < dstWidth; ++x) {
            const mx = x / ratioX;
            const x0 = Math.floor(mx) - n + 1;
            for (let y = 0; y < dstHeight; ++y) {
                const my = y / ratioY;
                const y0 = Math.floor(my) - n + 1;
                const pixel = {
                    r: 0,
                    g: 0,
                    b: 0,
                    a: 0
                };
                for (let i = 0; i < (2 * n); ++i) {
                    const xi = x0 + i;
                    if (xi < 0 || srcWidth <= xi) {
                        continue;
                    }
                    const dx = Math.abs(mx - xi);
                    const wx = weight(dx);
                    for (let j = 0; j < (2 * n); ++j) {
                        const yj = y0 + j;
                        if (yj < 0 || srcHeight <= yj) {
                            continue;
                        }
                        const dy = Math.abs(my - yj);
                        const wy = weight(dy);
                        const srcIndex = new ImageIndex(xi, yj, srcWidth);
                        for (const property of
                                ImageIndex.properties()) {
                            pixel[property] += data[srcIndex[property]] * wx * wy;
                        }
                    }
                }
                const dstIndex = new ImageIndex(x, y, dstWidth);
                for (const property of ImageIndex.properties()) {
                    result[dstIndex[property]] = pixel[property];
                }
            }
        }
        return result;
    }
}