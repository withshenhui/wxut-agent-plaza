/* 通用名单导出：CSV（Excel 友好 BOM+防科学计数法）+ Excel（SpreadsheetML .xls，零依赖）
   用法：exportRows({ title, meta, head, rows, filename })
   - head: ['学号','姓名',...]
   - rows: [['3026100000','张三','管理学院',...], ...]（全部字符串化后传入） */
export function exportRows({ title, meta = [], head, rows, filename }) {
  exportCsv({ title, meta, head, rows, filename });
}

export function exportCsv({ title, meta = [], head, rows, filename }) {
  const esc = (v) => {
    const s = String(v == null ? '' : v);
    // 防科学计数法：纯数字长串加 \t 前缀（Excel 打开后可见为文本，双击可编辑）
    const needTab = /^\d{8,}$/.test(s);
    const q = /[",\n\r]/.test(s) ? '"' : '';
    return (needTab ? '\t' : '') + (q ? s.replace(/"/g, '""') : s) + (q ? q : '');
  };
  const lines = [
    '\uFEFF# ' + title + '（AI数据洞察生成）',
    ...meta.map((m) => '# ' + m),
    head.map(esc).join(','),
    ...rows.map((r) => r.map(esc).join(',')),
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (filename || title) + '_' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export function exportExcel({ title, meta = [], head, rows, filename }) {
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  // 数字长串（学号）标记 ss:Style="s_id" 强制文本，防科学计数法
  const isLongNum = (s) => /^\d{8,}$/.test(String(s));
  const cell = (v) => isLongNum(v)
    ? `<Cell ss:StyleID="sId"><Data ss:Type="String">${esc(v)}</Data></Cell>`
    : `<Cell><Data ss:Type="String">${esc(v)}</Data></Cell>`;
  const sheetRows = [
    `<Row><Cell ss:StyleID="sTitle"><Data ss:Type="String">${esc(title)}（AI数据洞察生成）</Data></Cell></Row>`,
    ...meta.map((m) => `<Row><Cell ss:StyleID="sMeta"><Data ss:Type="String">${esc(m)}</Data></Cell></Row>`),
    '<Row/>',
    `<Row>${head.map((h) => `<Cell ss:StyleID="sHead"><Data ss:Type="String">${esc(h)}</Data></Cell>`).join('')}</Row>`,
    ...rows.map((r) => `<Row>${r.map(cell).join('')}</Row>`),
  ].join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles>
 <Style ss:ID="Default" ss:Name="Normal"><Font ss:FontName="微软雅黑" ss:Size="10"/><Alignment ss:Vertical="Center"/></Style>
 <Style ss:ID="sId"><NumberFormat ss:Format="@"/><Protection ss:Protected="0"/></Style>
 <Style ss:ID="sTitle"><Font ss:FontName="微软雅黑" ss:Size="12" ss:Bold="1" ss:Color="#182234"/></Style>
 <Style ss:ID="sMeta"><Font ss:FontName="微软雅黑" ss:Size="9" ss:Color="#64748B"/></Style>
 <Style ss:ID="sHead"><Font ss:FontName="微软雅黑" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#4A6CF7" ss:Pattern="Solid"/></Style>
</Styles>
<Worksheet ss:Name="名单">
<Table>
${sheetRows}
</Table>
</Worksheet>
</Workbook>`;
  const blob = new Blob(['\ufeff' + xml], { type: 'application/vnd.ms-excel' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (filename || title) + '_' + new Date().toISOString().slice(0, 10) + '.xls';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
