import { describe, expect, it } from 'vitest'
import getPowerSet from './power-set'

/**
 * 幂集是 SKU 规格联动的基础：库存集合的每个子集都要能反查到 skuId，
 * 用户选了任意规格组合后才知道该组合有没有货。
 * 这里锁住它的边界行为 —— 规格维度一多，组合数就是 2^n 爆炸。
 */
describe('getPowerSet（SKU 路径字典的基础）', () => {
  it('空集合返回一个空子集（2^0 = 1）', () => {
    expect(getPowerSet([])).toEqual([[]])
  })

  it('单元素返回 2 个子集', () => {
    const result = getPowerSet(['a'])
    expect(result).toHaveLength(2)
    expect(result).toContainEqual([])
    expect(result).toContainEqual(['a'])
  })

  it('三元素返回 8 个子集，且包含全集与空集', () => {
    const result = getPowerSet(['a', 'b', 'c'])
    expect(result).toHaveLength(8)
    expect(result).toContainEqual([])
    expect(result).toContainEqual(['a', 'b', 'c'])
    expect(result).toContainEqual(['b', 'c'])
  })

  it('子集数量严格等于 2^n —— 这正是规格维度的组合爆炸来源', () => {
    for (const size of [1, 2, 3, 4, 5]) {
      const set = Array.from({ length: size }, (_, index) => `v${index}`)
      expect(getPowerSet(set)).toHaveLength(2 ** size)
    }
    // 10 个规格维度 → 1024 个子集；20 个维度 → 1048576，这就是要重构算法的原因
    expect(getPowerSet(Array.from({ length: 10 }, (_, i) => i))).toHaveLength(1024)
  })

  it('不修改入参', () => {
    const input = ['x', 'y']
    getPowerSet(input)
    expect(input).toEqual(['x', 'y'])
  })
})
