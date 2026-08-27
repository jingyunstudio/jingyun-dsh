import React from 'react'
import { createPortal } from 'react-dom'
import { brandingManager, showToast } from '../components/BrandBranding'

export function JYCardActivateModal() {
  const [open, setOpen] = React.useState(false)
  const [appHost, setAppHost] = React.useState('')

  React.useEffect(() => {
    brandingManager.fetch().then(data => {
      const host = (data && data.appHost) || 'https://demo.jingyun.online/'
      setAppHost(host)
    })

    const handleOpen = () => setOpen(true)
    const handleClose = () => setOpen(false)

    window.addEventListener('jy_open_card_activate_modal', handleOpen)
    window.addEventListener('jy_close_card_activate_modal', handleClose)

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'JY_CARD_ACTIVATE_SUCCESS') {
        setOpen(false)
        window.dispatchEvent(new CustomEvent('jy_auth_changed'))
        try { showToast('🎉 卡密激活成功！权益与积分已实时生效') } catch (e) {}
      } else if (event.data?.type === 'JY_CARD_ACTIVATE_CLOSE') {
        setOpen(false)
      }
    }
    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('jy_open_card_activate_modal', handleOpen)
      window.removeEventListener('jy_close_card_activate_modal', handleClose)
      window.removeEventListener('message', handleMessage)
    }
  }, [])

  if (!open || !appHost || typeof document === 'undefined') return null

  let baseHost = appHost || 'https://demo.jingyun.online/'
  baseHost = baseHost.endsWith('/') ? baseHost : baseHost + '/'
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('jy_online_token') : ''
  const tokenQuery = token ? `&token=${encodeURIComponent(token)}` : ''
  const cardActivateIframeUrl = `${baseHost}card-activate-modal?embed=true${tokenQuery}`

  return createPortal(
    <div 
      className="jy-card-activate-modal-overlay"
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        backgroundColor: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <iframe
        src={cardActivateIframeUrl}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100vw',
          height: '100vh',
          border: 'none',
          display: 'block',
          backgroundColor: 'transparent'
        }}
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-downloads allow-modals"
        allow="camera; microphone; clipboard-read; clipboard-write; display-capture; autoplay; fullscreen"
      />
    </div>,
    document.body
  )
}
