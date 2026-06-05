import { useState } from 'react'
import { ProductTab } from './sales/ProductTab'
import { ServiceTab } from './sales/ServiceTab'

type Sub = 'product' | 'service'

export function Sales(): JSX.Element {
  const [sub, setSub] = useState<Sub>('product')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display text-brand-dark">Sales</h1>
        <div className="mt-4 flex gap-6 border-b border-brand-stone">
          <button className="tab-underline" data-active={sub === 'product'} onClick={() => setSub('product')}>
            Product
          </button>
          <button className="tab-underline" data-active={sub === 'service'} onClick={() => setSub('service')}>
            Service
          </button>
        </div>
      </div>

      <div key={sub} className="fade-in">
        {sub === 'product' ? <ProductTab /> : <ServiceTab />}
      </div>
    </div>
  )
}
