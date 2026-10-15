/**
 * 跨领域共享的基础类型。
 *
 * 仅收录与具体业务模块无关的原始类型，实体类型仍保留在各自 feature 的 types.ts；
 * 业务模块从这里取基础类型，避免业务模块之间互相 import 造成耦合。
 */

/** 启用状态：1=启用 0=停用，与后端数据库 tinyint 保持一致。 */
export type EnableStatus = 1 | 0
