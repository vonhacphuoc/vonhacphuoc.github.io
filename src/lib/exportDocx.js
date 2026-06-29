import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, HeadingLevel, ImageRun } from 'docx';


/**
 * Hàm xuất Word (.docx) cho mẫu móc len
 * @param {Object} project - Dự án mẫu móc len hiện tại (activeProject)
 * @param {Array} glossary - Thư viện ký hiệu để hiển thị chú giải
 */
export async function exportToDocx(project, glossary = []) {
  if (!project) return;

  const children = [];

  // 1. Tiêu đề mẫu móc (Primary Green: #476738)
  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: project.title.toUpperCase(),
          bold: true,
          size: 40, // 20pt
          color: "476738",
          font: "Inter",
        }),
      ],
      spacing: { after: 200 },
    })
  );

  // 2. Mô tả
  if (project.description) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: project.description,
            italic: true,
            size: 22, // 11pt
            color: "555555",
            font: "Inter",
          }),
        ],
        spacing: { after: 400 },
      })
    );
  }

  // 3. Ảnh bìa (nếu có và có thể tải được)
  if (project.image) {
    try {
      // Thử tải ảnh bìa qua CORS
      const res = await fetch(project.image, { mode: 'cors' }).catch(() => null);
      if (res && res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        
        // Đoán loại ảnh
        let imageType = 'png';
        if (project.image.toLowerCase().endsWith('.jpg') || project.image.toLowerCase().endsWith('.jpeg')) {
          imageType = 'jpg';
        } else if (project.image.toLowerCase().endsWith('.gif')) {
          imageType = 'gif';
        }


        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                data: arrayBuffer,
                transformation: {
                  width: 220,
                  height: 220,
                },
                type: imageType,
              }),
            ],
            spacing: { after: 400 },
          })
        );
      }
    } catch (err) {
      console.warn("Không thể tải ảnh cho Word export (Lỗi CORS hoặc mạng):", err);
    }
  }

  // Phân nhóm dữ liệu (Part) giống như trong App.jsx
  const groups = [];
  let currentGroup = null;
  let groupIndex = 0;

  project.data.forEach((item) => {
    if (item.part && item.part.trim() !== '') {
      currentGroup = {
        id: `group-${groupIndex++}`,
        title: item.part,
        items: [item]
      };
      groups.push(currentGroup);
    } else if (currentGroup) {
      currentGroup.items.push(item);
    }
  });

  // Border style chung cho bảng
  const cellBorders = {
    top: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB" },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB" },
    left: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB" },
    right: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB" },
  };

  // 4. Tạo bảng cho mỗi nhóm hàng (Part)
  groups.forEach((group) => {
    // Tiêu đề Part
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({
            text: `📍 Phần: ${group.title}`,
            bold: true,
            size: 28, // 14pt
            color: "476738",
            font: "Inter",
          }),
        ],
        spacing: { before: 300, after: 150 },
      })
    );

    // Xây dựng Table cho nhóm này
    const tableRows = [];

    // Header Row
    tableRows.push(
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { fill: "476738" },
            margins: { top: 120, bottom: 120, left: 150, right: 150 },
            borders: cellBorders,
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "Hàng / Vòng", bold: true, color: "FFFFFF", font: "Inter" }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 75, type: WidthType.PERCENTAGE },
            shading: { fill: "476738" },
            margins: { top: 120, bottom: 120, left: 150, right: 150 },
            borders: cellBorders,
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "Công thức / Hướng dẫn chi tiết", bold: true, color: "FFFFFF", font: "Inter" }),
                ],
              }),
            ],
          }),
        ],
      })
    );

    // Data Rows
    group.items.forEach((item) => {
      const cell2Children = [
        new Paragraph({
          children: [
            new TextRun({ text: item.formula || "", font: "Inter" }),
          ],
        }),
      ];

      // Nếu có note, thêm paragraph ghi chú
      if (item.note && item.note.trim() !== '') {
        cell2Children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `* Ghi chú: ${item.note}`, italic: true, color: "666666", size: 18, font: "Inter" }),
            ],
            spacing: { before: 60 },
          })
        );
      }

      tableRows.push(
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              width: { size: 25, type: WidthType.PERCENTAGE },
              shading: { fill: "F6F3EF" }, // nền nhạt
              margins: { top: 100, bottom: 100, left: 150, right: 150 },
              borders: cellBorders,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: item.row || "", bold: true, color: "1C1C1A", font: "Inter" }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 75, type: WidthType.PERCENTAGE },
              margins: { top: 100, bottom: 100, left: 150, right: 150 },
              borders: cellBorders,
              children: cell2Children,
            }),
          ],
        })
      );
    });

    // Tạo bảng
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: tableRows,
      })
    );
  });

  // 5. Tìm các ký hiệu tương đương sử dụng trong biểu đồ này để ghi chú chú giải (Glossary)
  const usedSymbols = glossary.filter(term => {
    const symbols = term.symbol.split('/');
    return project.data.some(row => 
      symbols.some(sym => row.formula && row.formula.includes(sym))
    );
  });

  if (usedSymbols.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({
            text: "📖 Ghi chú Ký hiệu (Tương đương)",
            bold: true,
            size: 28, // 14pt
            color: "635E55",
            font: "Inter",
          }),
        ],
        spacing: { before: 400, after: 150 },
      })
    );

    const glossaryRows = [];

    // Header của bảng chú giải
    glossaryRows.push(
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            shading: { fill: "635E55" },
            margins: { top: 100, bottom: 100, left: 150, right: 150 },
            borders: cellBorders,
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "Ký hiệu", bold: true, color: "FFFFFF", font: "Inter" }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            shading: { fill: "635E55" },
            margins: { top: 100, bottom: 100, left: 150, right: 150 },
            borders: cellBorders,
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "Tên gọi", bold: true, color: "FFFFFF", font: "Inter" }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            shading: { fill: "635E55" },
            margins: { top: 100, bottom: 100, left: 150, right: 150 },
            borders: cellBorders,
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "Cách móc / Chi tiết", bold: true, color: "FFFFFF", font: "Inter" }),
                ],
              }),
            ],
          }),
        ],
      })
    );

    // Dữ liệu bảng chú giải
    usedSymbols.forEach(term => {
      const instructionParagraphs = term.instructions.map(inst => (
        new Paragraph({
          children: [
            new TextRun({ text: `• ${inst}`, font: "Inter", size: 18 }),
          ],
        })
      ));

      glossaryRows.push(
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              width: { size: 20, type: WidthType.PERCENTAGE },
              shading: { fill: "F6F3EF" },
              margins: { top: 80, bottom: 80, left: 100, right: 100 },
              borders: cellBorders,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: term.symbol, bold: true, color: "476738", font: "Inter" }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              margins: { top: 80, bottom: 80, left: 100, right: 100 },
              borders: cellBorders,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: term.name, bold: true, font: "Inter" }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 80, bottom: 80, left: 100, right: 100 },
              borders: cellBorders,
              children: instructionParagraphs,
            }),
          ],
        })
      );
    });

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: glossaryRows,
      })
    );
  }

  // 6. Xây dựng cấu trúc Document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,    // 1 inch
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        children: children,
      },
    ],
  });

  // 7. Tạo blob và tải về máy khách
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Chart_${slugifyTitle(project.title)}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Hàm phụ để tạo slug cho tên file không dấu tiếng Việt
function slugifyTitle(str) {
  return str
    .toLowerCase()
    .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
    .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
    .replace(/[ìíịỉĩ]/g, 'i')
    .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
    .replace(/[ùúụủũưừứựửữ]/g, 'u')
    .replace(/[ỳýỵỷỹ]/g, 'y')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}
