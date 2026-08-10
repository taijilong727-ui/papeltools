/**
 * 生成加密 PDF 测试样本 — T-06-04/05/06（MVP 简化版）
 *
 * 密码：pass123（文档注释与 README 同步声明）
 *
 * 背景：pdf-lib 1.17.1 未提供 encrypt API，故按 PDF 规范 3.5.2
 * （标准安全处理器，算法 1：RC4 + 40 位密钥，revision 2）手写生成。
 * pdf.js 加载带 Encrypt 字典的 PDF 且未提供密码时，会抛
 * PasswordException("No password given") → @pdf2md/core 映射为
 * password_protected → 前端展示 encryptedFile 错误提示。
 *
 * 运行：npx tsx tests/fixtures/generate-encrypted.ts
 * 产物：tests/fixtures/sample-encrypted.pdf
 *
 * ⚠️ MVP 无密码对话框（PRD M-07 为 P1）：上传后直接显示加密错误提示
 * （见 tests/e2e/error-paths.spec.ts T-06-04/05/06）。
 */
import { createHash, randomBytes } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.join(__dirname, '..', 'fixtures');
const PASSWORD = 'pass123';

/** PDF 规范 3.5.2 表 3.20：32 字节密码填充串 */
const PADDING = Buffer.from(
  '28bf4e5e4e758a4164004e56fffa01082e2e00b6d0683e802f0ca9fe6453697a',
  'hex'
);

/** RC4 流密码（PDF 算法 1 的底层加密原语） */
function rc4(key: Uint8Array, data: Uint8Array): Uint8Array {
  const s = new Uint8Array(256);
  for (let i = 0; i < 256; i += 1) s[i] = i;
  let j = 0;
  for (let i = 0; i < 256; i += 1) {
    j = (j + s[i] + key[i % key.length]) & 0xff;
    const t = s[i];
    s[i] = s[j];
    s[j] = t;
  }
  const out = new Uint8Array(data.length);
  let a = 0;
  j = 0;
  for (let k = 0; k < data.length; k += 1) {
    a = (a + 1) & 0xff;
    j = (j + s[a]) & 0xff;
    const t = s[a];
    s[a] = s[j];
    s[j] = t;
    out[k] = data[k] ^ s[(s[a] + s[j]) & 0xff];
  }
  return out;
}

function main() {
  // ── 1. 权限与文件 ID ──────────────────────────────────────
  const P = -4; // 0xFFFFFFFC：权限位标记（打印/复制等）
  const id0 = randomBytes(16); // trailer ID[0]（参与密钥计算）

  // ── 2. 计算加密密钥（PDF 规范算法 2，R=2 无扩展部分）──────
  // key = MD5(paddedPassword + O + P(4 字节 LE) + ID[0]) 前 5 字节
  // 密码字节先补 0 到 32 字节，再与 PADDING 逐字节异或
  const userPassBytes = Buffer.from(PASSWORD, 'latin1');
  const padded = Buffer.alloc(32);
  userPassBytes.copy(padded);
  for (let i = 0; i < 32; i += 1) padded[i] ^= PADDING[i];

  const O = Buffer.alloc(32); // 简化：直接使用填充串（规范允许任意 32 字节）
  PADDING.copy(O);

  const pLE = Buffer.alloc(4);
  pLE.writeInt32LE(P, 0);

  const md5 = createHash('md5');
  md5.update(padded);
  md5.update(O);
  md5.update(pLE);
  md5.update(id0);
  const key = md5.digest().subarray(0, 5); // 40 位密钥

  // ── 3. 计算 U 值（算法 3，R=2：U = RC4(key, PADDING)）──────
  const U = Buffer.from(rc4(key, PADDING));

  // ── 4. 页面内容流：对象 4（objNum=4, genNum=0）─────────────
  const contentPlain = Buffer.from(
    'BT /F1 14 Tf 50 760 Td (Encrypted sample - password is pass123) Tj ET',
    'latin1'
  );
  // 对象级密钥：RC4(key, [objNum(3 字节 LE), genNum(2 字节 LE)])
  const objKey = rc4(key, Buffer.from([4, 0, 0, 0, 0]));
  const contentCipher = Buffer.from(rc4(objKey, contentPlain));

  // ── 5. 组装 PDF 字节并计算 xref 偏移 ──────────────────────
  const header = Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n', 'latin1');
  const parts: Buffer[] = [header];
  const offsets: number[] = [];

  const addObj = (body: string) => {
    const obj = Buffer.from(body, 'latin1');
    offsets.push(parts.reduce((sum, b) => sum + b.length, 0));
    parts.push(obj);
  };

  addObj('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  addObj('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  addObj(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n'
  );
  addObj(
    `4 0 obj\n<< /Length ${contentCipher.length} >>\nstream\n` +
      contentCipher.toString('latin1') +
      '\nendstream\nendobj\n'
  );
  addObj('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');
  addObj(
    `6 0 obj\n<< /Filter /Standard /V 1 /R 2 /O <${O.toString('hex')}> /U <${U.toString('hex')}> /P ${P} >>\nendobj\n`
  );

  const xrefOffset = parts.reduce((sum, b) => sum + b.length, 0);
  const xref = Buffer.from(
    `xref\n0 7\n0000000000 65535 f \n` +
      offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('') +
      `trailer\n<< /Size 7 /Root 1 0 R /Encrypt 6 0 R /ID [<${id0.toString('hex')}> <${id0.toString('hex')}>] >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
    'latin1'
  );
  parts.push(xref);

  mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, 'sample-encrypted.pdf');
  writeFileSync(outPath, Buffer.concat(parts));
  console.log(`[fixtures] 已生成 ${outPath}（密码 ${PASSWORD}，RC4-40 / R2 加密）`);
}

try {
  main();
} catch (err) {
  console.error('[fixtures] 生成失败:', err);
  process.exit(1);
}
