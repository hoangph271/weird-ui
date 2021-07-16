import { FC, useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import './App.css'

const UI_ROOT = 'http://localhost:3001'
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
const isImage = (stat: FSStat) => {
  const ext = stat.path.split('.').pop()?.toLowerCase()

  if (!ext) return false

  return ['png', 'jpg', 'jpeg'].includes(ext)
}

const PATH_SEP = '/'
const Breadcrumbs: FC<{ path: string }> = (props) => {
  const parts = props.path.split(PATH_SEP)

  return (
    <nav>
      <ul style={{ display: 'flex', listStyle: 'none' }}>
        {parts.map((part, i) => {
          if (i === parts.length - 1) {
            return (
              <li key={i}>{part}</li>
            )
          }

          const url = `${UI_ROOT}/${btoa(parts.slice(0, i + 1).join(PATH_SEP))}`
          return (
            <li key={i}>
              <a href={url}>
                <span>{part}</span>
                <span>{PATH_SEP}</span>
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

const DirectoryGrid = styled((props: { className?: string, fsStat: FSStat }) => {
  const { className, fsStat } = props

  return (
    <ul className={className}>
      {fsStat.children?.map(entry => {
        return (
          <li key={entry.cid}>
            <div
              className={`preview ${entry.type}`}
              style={{
                backgroundImage: `url(${entry.type === 'file' ? `${API_ROOT}/raw/${entry.cid}` : 'https://cdn4.iconfinder.com/data/icons/small-n-flat/24/folder-blue-512.png'})`
              }}
            />
            <a href={`${UI_ROOT}/${btoa(encodeURIComponent(entry.path))}`} className="title">
              {entry.path.split('/').pop()}
            </a>
            {/* // TODO: Delete...? */}
            {/* <div
              style={{ flexGrow: 1, textAlign: 'right', cursor: 'pointer' }}
              onClick={async () => {
                if (window.confirm(`Delete ${entry.cid}`)) {
                  await fetch(`${API_ROOT}/${btoa(encodeURIComponent(entry.path))}`, { method: 'DELETE' })

                  window.location.reload()
                }
              }}
            >X</div> */}
          </li>
        )
      })}
    </ul>
  )
})`
  padding: 0.6rem;
  display: grid;
  gap: 0.6rem;
  grid-template-columns: repeat(5, minmax(200px, 1fr));

  @media (max-width: 1200px) {
    & { grid-template-columns: repeat(4, minmax(200px, 1fr)); }
  }
  @media (max-width: 1000px) {
    & { grid-template-columns: repeat(3, minmax(200px, 1fr)); }
  }
  @media (max-width: 800px) {
    & { grid-template-columns: repeat(2, minmax(200px, 1fr)); }
  }
  @media (max-width: 400px) {
    & { grid-template-columns: repeat(1, minmax(180px, 1fr)); }
  }

  li {
    height: 14rem;
    flex-direction: column;
    position: relative;
    display: flex;
    justify-content: start;
    box-shadow: 0 0 6px rgb(178 178 178 / 80%);
    border-radius: 0.4rem;

    &:hover {
      box-shadow: 0 0 8px rgb(78 78 78 / 90%);
    }

    .preview {
      border-radius: 0.4rem;
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      flex-grow: 1;
      border: 1px solid lightgray;

      &.directory {
        background-size: 40%;
      }
    }
    .title {
      cursor: pointer;
      color: black;
      text-decoration: none;

      border-radius: 0.4rem;
      border-top-left-radius: 0;
      border-top-right-radius: 0;
      position: absolute;
      text-overflow: ellipsis;
      overflow: auto;
      bottom: 0;
      width: 100%;
      background-color: rgb(246 189 223 / 88%);
      padding: 0.6rem 0.2rem;
      box-sizing: border-box;
      white-space: pre;
    }
  }
`
const FilePreviewer = styled((props: { className?: string, fsStat: FSStat }) => {
  const { className, fsStat } = props

  const url = `${API_ROOT}/raw/${fsStat.cid}`
  const filename = fsStat.path.split(PATH_SEP).pop()

  if (isVideo(fsStat)) {
    return (
      <video src={url} style={{ maxWidth: '100%' }} controls muted autoPlay />
    )
  }

  if (isImage(fsStat)) {
    return (
      <img src={url} alt={filename} style={{ maxWidth: '100%' }} />
    )
  }

  return (
    <div className={className}>
      {filename}
    </div>
  )
})``

const FileViewer = (props: { fsStat: FSStat }) => {
  const { fsStat } = props

  return (
    <div>
      <FilePreviewer fsStat={fsStat} />
      <div>
        <a rel="noopener noreferrer" target="_blank" href={`https://ipfs.io/ipfs/${fsStat.cid}?filename=${encodeURIComponent(fsStat.path.split('/').pop() ?? 'file')}`}>
          Share
        </a>
        <span>{' | '}</span>
        <a rel="noopener noreferrer" target="_blank" href={`${API_ROOT}/raw/${fsStat.cid}?filename=${encodeURIComponent(fsStat.path.split('/').pop() ?? 'file')}`}>
          Download
        </a>
      </div>
    </div>
  )
}

const FSActions = (props: { fsStat: FSStat }) => {
  const { fsStat } = props
  const fileRef = useRef<HTMLInputElement>(null)
  const dirnameRef = useRef<HTMLInputElement>(null)

  return (
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
  )
}

function App () {
  const path = window.location.pathname.substring(1) || btoa('/')
  const [fsStat, setFsStat] = useState<FSStat | null>(null)

  useEffect(() => {
    fetch(`${API_ROOT}/dir/${path}`).then(async res => {
      const fsStat = await res.json()
      setFsStat(fsStat)
    })
  }, [path])

  return (
    <div className="App">
      {fsStat ? (
        <div>
          <Breadcrumbs path={fsStat.path} />
          <DirectoryGrid fsStat={fsStat} />
          <FileViewer fsStat={fsStat} />
          <FSActions fsStat={fsStat} />
        </div>
      ) : (
        <div>
          {'...!'}
        </div>
      )}
    </div>
  )
}

export default App
