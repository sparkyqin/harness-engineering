#!/usr/bin/env python3
"""check-e2e-evidence.py — TE B 类 E2E 证据闭环校验

用途：TE 跑完 B 类真实浏览器 E2E 后，校验证据是否真实闭环：
  1. test-report.md 是否声明了 B 类用例 ↔ Scenario(R-xxx/S-xxx) 映射
  2. Playwright 报告是否真实存在（HTML/JUnit）
  3. 失败用例是否都有"复现步骤 + 期望 vs 实际 + 归属判定"
  4. 是否有"伪造验证"嫌疑（如声称 PASS 但无报告文件）

堵住"伪造验证"（嘴上说 E2E 通过，实际没跑）。
用法: python .harness/scripts/check-e2e-evidence.py <task>
退出码：0 = 证据闭环；1 = 证据缺失/伪造嫌疑。
"""
import sys
import os
import re
import json
from pathlib import Path


def main():
    if len(sys.argv) < 2:
        print("用法: check-e2e-evidence.py <task>")
        sys.exit(1)
    task = sys.argv[1]
    harness = Path(__file__).resolve().parent.parent
    deliverable = harness / "deliverables" / task
    report = deliverable / "test-report.md"

    if not report.is_file():
        print(f"[e2e-evidence] FAIL：test-report.md 不存在: {report}")
        sys.exit(1)

    text = report.read_text(encoding="utf-8", errors="replace")
    problems = []

    # 1. B 类用例 ↔ Scenario 映射
    mapping = re.findall(r"R-\d+/S-\d+", text)
    if not mapping:
        problems.append("未发现 R-xxx/S-xxx 映射（B 类用例须对应需求 Scenario）")

    # 2. 矩阵中 B 类行
    if "B. 功能验收" not in text and "B." not in text:
        problems.append("测试矩阵缺少 B 类功能验收行")
    b_pass_match = re.search(r"B\.\s*功能验收.*?\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)", text, re.S)

    # 3. 结论
    conclusion = re.search(r"##\s*结论\s*(PASS|FAIL)", text)
    if not conclusion:
        problems.append("缺少 '## 结论 PASS|FAIL' 段")

    # 4. 证据文件（Playwright 报告）
    evidence_dirs = [
        deliverable / "e2e-report",
        deliverable.parent.parent / "playwright-report",
        harness.parent / "playwright-report",
    ]
    has_evidence = any(d.exists() for d in evidence_dirs)
    # 也接受 test-report.md 内贴出的命令输出
    has_cmd_output = bool(re.search(r"npm run test:e2e|playwright|passed|failed", text, re.I))

    if conclusion and conclusion.group(1) == "PASS":
        if not has_evidence and not has_cmd_output:
            problems.append("声称 PASS 但无 Playwright 报告/命令输出（伪造验证嫌疑）")
        if b_pass_match:
            total, passed, failed = (int(x) for x in b_pass_match.groups())
            if failed > 0:
                problems.append(f"矩阵显示 B 类有 {failed} 失败，但结论为 PASS（矛盾）")
            if total == 0:
                problems.append("B 类用例数为 0（最低要求 ≥ X 条）")

    # 5. 失败用例详情（若有 FAIL）
    if conclusion and conclusion.group(1) == "FAIL":
        if "复现步骤" not in text and "期望" not in text:
            problems.append("FAIL 但缺少失败用例详情（复现步骤/期望 vs 实际）")
        if "归属" not in text and "实现级" not in text and "需求级" not in text:
            problems.append("FAIL 但缺少归属判定（实现级/需求级）")

    if problems:
        print("[e2e-evidence] FAIL：证据闭环不完整")
        for p in problems:
            print(f"  - {p}")
        sys.exit(1)

    print("[e2e-evidence] PASS：B 类 E2E 证据闭环完整")
    sys.exit(0)


if __name__ == "__main__":
    main()
