"""Render VenueVista's original geometric mark with only the Python standard library."""
from pathlib import Path
import struct
import zlib

ROOT = Path(__file__).parent

def inside(x, y, points):
    hit = False
    j = len(points) - 1
    for i, (xi, yi) in enumerate(points):
        xj, yj = points[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            hit = not hit
        j = i
    return hit


def render(name, transparent=False):
    size = 1024
    rows = []
    v = [(282, 325), (369, 325), (516, 651), (654, 325), (730, 325), (536, 754), (480, 754)]
    star = [(745, 217), (762, 259), (804, 276), (762, 293), (745, 335), (728, 293), (686, 276), (728, 259)]
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            if inside(x, y, v) or inside(x, y, star):
                row.extend((216, 185, 121, 255))
            elif transparent:
                row.extend((0, 0, 0, 0))
            else:
                glow = max(0, 1 - (((x - 512) ** 2 + (y - 420) ** 2) ** .5 / 680))
                row.extend((int(17 + 26 * glow), int(16 + 11 * glow), int(21 + 42 * glow), 255))
        rows.append(bytes(row))
    def chunk(label, data):
        return struct.pack('>I', len(data)) + label + data + struct.pack('>I', zlib.crc32(label + data) & 0xffffffff)
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(b''.join(rows), 9)) + chunk(b'IEND', b'')
    (ROOT / name).write_bytes(png)

render('icon.png')
render('adaptive-icon.png', transparent=True)
render('splash.png', transparent=True)
