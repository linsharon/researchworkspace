# Frontend Translation Audit CSV

文件：frontend_translation_audit.csv

用法：
- 保留表头不变。
- 只需要编辑 desired_chinese 这一列。
- 已经翻译好的行，desired_chinese 默认会预填当前中文，你可以直接改成更合适的中文。
- 还没翻译的行，desired_chinese 目前为空，你可以直接补上中文。
- status_current 用来表示当前代码状态：translated、untranslated、needs_review。
- file 和 line 用来定位原始代码位置。

当你把更新后的 CSV 发回给我时，我可以按 desired_chinese 这一列批量更新前端中文文案。