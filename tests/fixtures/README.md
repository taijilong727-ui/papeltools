# 测试样本（fixtures）说明

> 对应 `docs/测试策略与计划-2026-08-04.md` 的 f-01 ~ f-10 清单。
> 所有样本由脚本**程序化生成**并随仓库入库（策略 P-5：确定性 + CI 可复用）。

## 一键生成

```bash
npm run generate:fixtures
```

等价于 `npx tsx tests/fixtures/generate-all.ts`，依次生成（顺序有依赖，勿并行）：

| 脚本 | 产物 | 用途（测试策略编号） |
|------|------|----------------------|
| `generate-text.ts` | `sample-text.pdf`（5 页） | T-01 主路径：H1-H6、列表、表格、代码块、链接、多栏、页眉页脚 |
| `generate-text.ts --pages 100` | `sample-100p.pdf` | T-05 性能、T-06-08 取消/刷新 |
| `generate-scanned.ts` | `sample-scanned.pdf` | T-01-09/10（迁移）：无文本层 → scanned 提示 |
| `generate-encrypted.ts` | `sample-encrypted.pdf` | T-06-04/05/06（MVP 版）：加密 → encrypted 提示 |
| `generate-corrupted.ts` | `sample-corrupted.pdf` | T-06-01：截断损坏 → corrupted 提示 |
| `generate-large.ts --size 201` | `sample-large.pdf` | T-06-03/07（可选，默认不入库） |

## 单独生成

```bash
# 100 页性能样本（约 300KB，体积可控可入库）
npx tsx tests/fixtures/generate-text.ts --pages 100

# 201MB 超大样本（⚠️ 仅本地手动验证用，不入库）
npx tsx tests/fixtures/generate-large.ts --size 201
```

## 关键约定

- **`sample-text.pdf` 的 PDF 元数据标题固定为 `Sample Text Document`**
  ——`tests/e2e/converter-flow.spec.ts` 的下载文件名断言（`Sample-Text-Document*.md`）依赖此值，改标题需同步改断言。
- **加密样本密码固定 `pass123`**：MVP 无密码对话框（PRD M-07 为 P1 规划），
  当前行为是直接显示加密错误提示；实现密码对话框后需补充"错误密码 3 次 / 正确密码成功 / 取消"用例（见 `error-paths.spec.ts` 顶部注释）。
- `generate-corrupted.ts` 依赖 `sample-text.pdf` 已生成（先跑 generate-text）。
- E2E 用例对缺失的 fixture 一律 `test.skip`，不会因缺样本而报红。

## 依赖

- `pdf-lib`（devDependency）——文本型 / 扫描型 / 加密样本的生成
- `tsx`（devDependency）——TS 脚本直接运行（npm script 已配置）
