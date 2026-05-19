---
name: ai-detect
description: 检测文本是否为 AI 生成
---

请使用 agent 工具（subagent_type 设为 "ai-detector"）来分析文本的 AI 特征。

用户可能提供以下内容之一：
1. 直接粘贴的文本段落
2. 文件路径或章节名称（请先用 read_file 读取）

请将用户提供的文本传递给 ai-detector subagent 进行分析。如果用户没有提供文本，请询问他们想要检测的内容。
