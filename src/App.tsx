import { useEffect, useRef, useState } from 'react'
import './App.css'

const UI_ROOT = 'http://139.162.48.5:7132'
const API_ROOT = 'http://139.162.48.5:7131'

type FSType = 'directory' | 'file'
type FSEntry = {
  cid: string,
  path: string,
  mode: number,
  name: string,
  size: number,
  type: FSType
}
type FSStat = {
  cid: string,
  path: string,
  blocks: number,
  children?: FSEntry[],
  cumulativeSize: number,
  mode: number,
  size: number,
  type: FSType,
  withLocality: boolean
}

const isVideo = (stat: FSStat) => {
  const ext = stat.path.split('.').pop()?.toLowerCase()

  if (!ext) return false

  return ['mov', 'mp4'].includes(ext)
}

function App () {
  const path = window.location.pathname.substring(1) || btoa('/')
  const fileRef = useRef<HTMLInputElement>(null)
  const dirnameRef = useRef<HTMLInputElement>(null)
  const [fsStat, setFsStat] = useState<FSStat | null>(null)

  useEffect(() => {
    fetch(`${API_ROOT}/dir/${path}`).then(async res => {
      const fsStat = await res.json()
      setFsStat(fsStat)
    })
  }, [path])

  const parentPath = fsStat
    ? `${fsStat.path.split('/').slice(0, -1).join('/')}`
    : '/'

  return (
    <div className="App">
      {fsStat
        ? (
        <div>
          {fsStat.path !== '/' && (
            <a href={`${UI_ROOT}/${parentPath === '/' ? '' : btoa(parentPath)}`}>
              {parentPath || '/'}
            </a>
          )}
          <h4>{fsStat.path}</h4>
          {fsStat.children && (
            <ul style={{ padding: 0 }}>
              {fsStat.children.map(entry => {
                return (
                  <li
                    key={entry.cid}
                    style={{
                      display: 'flex',
                      justifyContent: 'start',
                      gap: '10px',
                      margin: '10px 0'
                    }}
                  >
                    <div
                      style={{
                        backgroundSize: 'contain',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        width: '20px',
                        height: '20px',
                        backgroundImage: `url(${entry.type === 'file' ? `${API_ROOT}/raw/${entry.cid}` : ''})`
                      }}
                    />
                    <a href={`${UI_ROOT}/${btoa(encodeURIComponent(entry.path))}`}>
                      {entry.path.split('/').pop()}
                    </a>
                    <div
                      style={{ flexGrow: 1, textAlign: 'right', cursor: 'pointer' }}
                      onClick={async () => {
                        if (window.confirm(`Delete ${entry.cid}`)) {
                          await fetch(`${API_ROOT}/${btoa(encodeURIComponent(entry.path))}`, { method: 'DELETE' })

                          window.location.reload()
                        }
                      }}
                    >X</div>
                  </li>
                )
              })}
            </ul>
          )}
          {fsStat.type === 'file'
            ? (
              <div>
              {isVideo(fsStat)
                ? (
                <video src={`${API_ROOT}/raw/${fsStat.cid}`} style={{ maxWidth: '100%' }} controls muted autoPlay />
                  )
                : (
                <img src={`${API_ROOT}/raw/${fsStat.cid}`} alt={fsStat.path} style={{ maxWidth: '100%' }} />
                  )
              }
              <div>
                <a rel="noopener noreferrer" target="_blank" href={`https://ipfs.io/ipfs/${fsStat.cid}?filename=${encodeURIComponent(fsStat.path.split('/').pop() ?? 'file')}`}>
                  Share
                </a>
                <a rel="noopener noreferrer" target="_blank" href={`${API_ROOT}/raw/${fsStat.cid}?filename=${encodeURIComponent(fsStat.path.split('/').pop() ?? 'file')}`}>
                  Download
                </a>
              </div>
            </div>
              )
            : (
            <div>
              <hr />
              <form onSubmit={async e => {
                e.preventDefault()

                for (const file of Array.from(fileRef.current?.files ?? [])) {
                  const filePath = [
                    fsStat.path.endsWith('/') ? fsStat.path : `${fsStat.path}/`,
                    file.name
                  ].join('')

                  await fetch(`${API_ROOT}/write/${btoa(encodeURIComponent(filePath))}`, {
                    method: 'POST',
                    body: file
                  })
                }

                window.location.reload()
              }}>
                <input type="file" name="file" ref={fileRef} required multiple />
                <button type="submit">Upload</button>
              </form>
              <hr />
              <form onSubmit={async e => {
                e.preventDefault()

                const filePath = `${fsStat.path}/${dirnameRef.current?.value}`
                await fetch(`${API_ROOT}/mkdir/${btoa(filePath)}`, {
                  method: 'POST'
                })

                window.location.reload()
              }}>
                <input type="text" name="dirname" ref={dirnameRef} required />
                <button type="submit">mkdir</button>
              </form>
            </div>
              )}
        </div>
          )
        : (
        <div>
          {'...!'}
        </div>
          )}
    </div>
  )
}

export default App
