import { Tag } from 'antd'
import { INSPECTION_RESULT_META, type InspectionResult } from '../types'

/** 验收结论标签：待验收橙 / 全部合格绿 / 部分合格蓝 / 全部不合格红。 */
export function InspectionResultTag({ result }: { result: InspectionResult }) {
  const meta = INSPECTION_RESULT_META[result]
  return <Tag color={meta.color}>{meta.label}</Tag>
}
