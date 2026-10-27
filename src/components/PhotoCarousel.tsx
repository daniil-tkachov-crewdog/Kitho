import { useEffect, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from './Icons'

export default function PhotoCarousel({ urls, alt }: { urls: string[]; alt: string }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    setI(0)
  }, [urls])

  const count = urls.length
  const go = (d: number) => setI((v) => (v + d + count) % count)

  return (
    <div className="carousel">
      {count > 0 && <img src={urls[i]} alt={`${alt} — photo ${i + 1} of ${count}`} draggable={false} />}
      {count > 1 && (
        <>
          <div className="dots" aria-hidden>
            {urls.map((u, n) => <span key={u} className={n === i ? 'on' : ''} />)}
          </div>
          <button className="nav-zone prev" aria-label="Previous photo" onClick={() => go(-1)} />
          <button className="nav-zone next" aria-label="Next photo" onClick={() => go(1)} />
          <button className="arrow prev" aria-label="Previous photo" onClick={() => go(-1)}><ChevronLeftIcon /></button>
          <button className="arrow next" aria-label="Next photo" onClick={() => go(1)}><ChevronRightIcon /></button>
        </>
      )}
    </div>
  )
}
