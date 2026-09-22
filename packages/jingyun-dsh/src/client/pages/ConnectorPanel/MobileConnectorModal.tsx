import React, { useEffect, useState } from 'react';

import { showToast } from '../../components/BrandBranding';

export interface MobileDevice {
  id: string;
  state: 'device' | 'offline' | 'unauthorized';
  model: string;
  product?: string;
  type: 'usb' | 'wifi';
}

export interface MobileStatusData {
  installed: boolean;
  adbPath?: string;
  devices: MobileDevice[];
}

export interface MobileConnectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export const MobileBrandIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="5"
      y="2"
      width="14"
      height="20"
      rx="3"
      stroke="#10B981"
      strokeWidth="2"
      fill="none"
    />
    <line
      x1="11"
      y1="18"
      x2="13"
      y2="18"
      stroke="#10B981"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <line
      x1="9"
      y1="5"
      x2="15"
      y2="5"
      stroke="#10B981"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

export const MobileConnectorModal: React.FC<MobileConnectorModalProps> = ({
  isOpen,
  onClose,
  onRefresh,
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<MobileStatusData | null>(null);
  const [wifiHost, setWifiHost] = useState('');
  const [wifiPort, setWifiPort] = useState('5555');
  const [connecting, setConnecting] = useState(false);
  const [wirelessTab, setWirelessTab] = useState<'connect' | 'pair'>('connect');
  const [connectError, setConnectError] = useState<string | null>(null);
  const [pairCode, setPairCode] = useState('');
  const [pairing, setPairing] = useState(false);
  const [enablingTcpIp, setEnablingTcpIp] = useState<string | null>(null);
  const [previewDeviceId, setPreviewDeviceId] = useState<string | null>(null);
  const [previewTimestamp, setPreviewTimestamp] = useState<number>(() =>
    Date.now()
  );
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/jingyun/connectors/mobile/status');
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json.data);
      } else {
        showToast(json.error);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      showToast(`网络请求异常: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPreviewDeviceId(null);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    queueMicrotask(() => {
      fetchStatus();
    });
  }, [isOpen]);

  const handleConnectWifi = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanHost = wifiHost.trim();
    if (!cleanHost) {
      showToast('请输入手机 IP 地址');
      return;
    }
    const cleanPort = wifiPort.trim() ? Number(wifiPort.trim()) : 5555;
    if (isNaN(cleanPort) || cleanPort <= 0 || cleanPort > 65535) {
      showToast('端口必须为有效数字 (1-65535)');
      return;
    }

    setConnecting(true);
    setConnectError(null);
    try {
      const res = await fetch('/api/jingyun/connectors/mobile/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: cleanHost,
          port: cleanPort,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setConnectError(null);
        showToast(json.message);
        await fetchStatus();
        onRefresh?.();
      } else {
        setConnectError(json.error);
        showToast(json.error);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      showToast(`请求异常: ${message}`);
    } finally {
      setConnecting(false);
    }
  };

  const handlePairWifi = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanHost = wifiHost.trim();
    if (!cleanHost) {
      showToast('请输入手机 IP 地址');
      return;
    }
    const pairPort = Number(wifiPort.trim());
    if (isNaN(pairPort) || pairPort <= 0 || pairPort > 65535) {
      showToast('临时配对端口必须为有效数字 (1-65535)');
      return;
    }
    const cleanCode = pairCode.trim();
    if (!cleanCode) {
      showToast('请输入 6 位配对码');
      return;
    }

    setPairing(true);
    try {
      const res = await fetch('/api/jingyun/connectors/mobile/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: cleanHost,
          port: pairPort,
          code: cleanCode,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(json.message);
        setWirelessTab('connect');
        setPairCode('');
        setWifiPort('5555');
      } else {
        showToast(json.error);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      showToast(`配对请求异常: ${message}`);
    } finally {
      setPairing(false);
    }
  };

  const handleEnableTcpIp = async (deviceId: string) => {
    setEnablingTcpIp(deviceId);
    try {
      const res = await fetch('/api/jingyun/connectors/mobile/tcpip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, port: 5555 }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(json.message);
        await fetchStatus();
      } else {
        showToast(json.error);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      showToast(`开启无线端口异常: ${message}`);
    } finally {
      setEnablingTcpIp(null);
    }
  };

  const handleDisconnect = async (target: string) => {
    try {
      const res = await fetch('/api/jingyun/connectors/mobile/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(json.message);
        await fetchStatus();
        onRefresh?.();
      } else {
        showToast(json.error);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      showToast(`请求异常: ${message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1050,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'jyFadeIn 0.15s ease-out',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '640px',
          maxHeight: '90vh',
          backgroundColor: 'var(--dsw-alias-bg-layer-2, #ffffff)',
          borderRadius: '16px',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.15)',
          border:
            '1px solid var(--dsw-alias-border-l2, var(--dsw-alias-border, #e2e8f0))',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'jyScaleUp 0.15s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom:
              '1px solid var(--dsw-alias-border-l2, var(--dsw-alias-border, #f1f5f9))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MobileBrandIcon size={24} />
            </div>
            <div>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--dsw-alias-label-primary, #0f172a)',
                }}
              >
                移动设备管理 (Android)
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--dsw-alias-label-tertiary, #64748b)',
                  marginTop: '2px',
                }}
              >
                通过便携 ADB 与 Accessibility 语义树控制真机或模拟器
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--dsw-alias-label-tertiary, #94a3b8)',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* 内容区 */}
        <div
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* 1. 已连接设备列表 */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px',
              }}
            >
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--dsw-alias-label-primary, #1e293b)',
                }}
              >
                已连接设备 (
                {data
                  ? data.devices.filter((d) => d.state === 'device').length
                  : 0}
                )
              </div>
              <button
                type="button"
                onClick={fetchStatus}
                disabled={loading}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '12px',
                  color: 'var(--dsw-alias-brand-primary, #3b82f6)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    animation: loading ? 'spin 1s linear infinite' : 'none',
                  }}
                >
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
                {loading ? '刷新中...' : '刷新列表'}
              </button>
            </div>

            {data && data.devices.length > 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {data.devices.map((device) => {
                  const isOnline = device.state === 'device';
                  return (
                    <div
                      key={device.id}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '12px',
                        border:
                          '1px solid var(--dsw-alias-border-l2, var(--dsw-alias-border, #e2e8f0))',
                        background: 'var(--dsw-alias-bg-layer-3, #f8fafc)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: isOnline ? '#10B981' : '#F59E0B',
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              fontSize: '13px',
                              fontWeight: 600,
                              color: 'var(--dsw-alias-label-primary, #0f172a)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {device.model}
                          </div>
                          <div
                            style={{
                              fontSize: '11px',
                              color: 'var(--dsw-alias-label-tertiary, #64748b)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              marginTop: '2px',
                              minWidth: 0,
                            }}
                          >
                            <span
                              style={{
                                fontFamily: 'monospace',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '280px',
                              }}
                              title={device.id}
                            >
                              {device.id}
                            </span>
                            <span>•</span>
                            <span
                              style={{
                                textTransform: 'uppercase',
                                fontWeight: 600,
                                fontSize: '10px',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background:
                                  device.type === 'wifi'
                                    ? 'rgba(59, 130, 246, 0.1)'
                                    : 'rgba(100, 116, 139, 0.1)',
                                color:
                                  device.type === 'wifi'
                                    ? '#2563eb'
                                    : '#475569',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                              }}
                            >
                              {device.type}
                            </span>
                            <span>•</span>
                            <span
                              style={{
                                color: isOnline
                                  ? '#059669'
                                  : device.state === 'unauthorized'
                                    ? '#d97706'
                                    : '#94a3b8',
                                fontWeight: 500,
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                              }}
                            >
                              {isOnline
                                ? '在线'
                                : device.state === 'unauthorized'
                                  ? '未授权调试'
                                  : '离线'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          flexShrink: 0,
                        }}
                      >
                        {isOnline && (
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewDeviceId(device.id);
                              setPreviewTimestamp(Date.now());
                            }}
                            style={{
                              height: '30px',
                              padding: '0 12px',
                              borderRadius: '6px',
                              border:
                                '1px solid var(--dsw-alias-border-l2, #cbd5e1)',
                              background: '#ffffff',
                              color: 'var(--dsw-alias-label-primary, #334155)',
                              fontSize: '11px',
                              cursor: 'pointer',
                              fontWeight: 500,
                              whiteSpace: 'nowrap',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            屏幕快照
                          </button>
                        )}
                        {device.type === 'usb' && isOnline && (
                          <button
                            type="button"
                            disabled={enablingTcpIp === device.id}
                            onClick={() => handleEnableTcpIp(device.id)}
                            style={{
                              height: '30px',
                              padding: '0 12px',
                              borderRadius: '6px',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              background: 'rgba(16, 185, 129, 0.08)',
                              color: '#059669',
                              fontSize: '11px',
                              cursor:
                                enablingTcpIp === device.id
                                  ? 'not-allowed'
                                  : 'pointer',
                              fontWeight: 500,
                              whiteSpace: 'nowrap',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {enablingTcpIp === device.id
                              ? '开启中...'
                              : '开启无线模式 (5555)'}
                          </button>
                        )}
                        {device.type === 'wifi' && (
                          <button
                            type="button"
                            onClick={() => handleDisconnect(device.id)}
                            style={{
                              height: '30px',
                              padding: '0 12px',
                              borderRadius: '6px',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              background: 'rgba(239, 68, 68, 0.06)',
                              color: '#ef4444',
                              fontSize: '11px',
                              cursor: 'pointer',
                              fontWeight: 500,
                              whiteSpace: 'nowrap',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            断开
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  padding: '24px',
                  borderRadius: '10px',
                  border:
                    '1px dashed var(--dsw-alias-border-l2, var(--dsw-alias-border, #cbd5e1))',
                  textAlign: 'center',
                  color: 'var(--dsw-alias-label-tertiary, #64748b)',
                  fontSize: '12px',
                }}
              >
                <div
                  style={{
                    marginBottom: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}
                >
                  暂未检测到已连接的 Android 设备
                </div>
                <div>
                  1. 用 USB 数据线连接手机并开启【开发者选项 &rarr; USB 调试】
                </div>
                <div style={{ marginTop: '2px' }}>
                  2. 或在下方输入局域网 IP 与端口进行无线连接
                </div>
              </div>
            )}
          </div>

          {/* 2. 局域网无线连接与配对 */}
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              border:
                '1px solid var(--dsw-alias-border-l2, var(--dsw-alias-border, #e2e8f0))',
              background: 'var(--dsw-alias-bg-layer-3, #f8fafc)',
            }}
          >
            {/* Tab 切换器 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: '4px',
                  background: 'rgba(0, 0, 0, 0.05)',
                  padding: '3px',
                  borderRadius: '8px',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setWirelessTab('connect');
                    setConnectError(null);
                  }}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: 'none',
                    background:
                      wirelessTab === 'connect'
                        ? 'var(--dsw-alias-bg-layer-2, #ffffff)'
                        : 'transparent',
                    color:
                      wirelessTab === 'connect'
                        ? 'var(--dsw-alias-label-primary, #0f172a)'
                        : 'var(--dsw-alias-label-tertiary, #64748b)',
                    boxShadow:
                      wirelessTab === 'connect'
                        ? '0 1px 3px rgba(0,0,0,0.08)'
                        : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  直接连接 (TCP/IP)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWirelessTab('pair');
                    setConnectError(null);
                  }}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: 'none',
                    background:
                      wirelessTab === 'pair'
                        ? 'var(--dsw-alias-bg-layer-2, #ffffff)'
                        : 'transparent',
                    color:
                      wirelessTab === 'pair'
                        ? 'var(--dsw-alias-label-primary, #0f172a)'
                        : 'var(--dsw-alias-label-tertiary, #64748b)',
                    boxShadow:
                      wirelessTab === 'pair'
                        ? '0 1px 3px rgba(0,0,0,0.08)'
                        : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  配对码配对 (Android 11+)
                </button>
              </div>
            </div>

            {wirelessTab === 'connect' ? (
              <form onSubmit={handleConnectWifi}>
                <div
                  style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
                >
                  <input
                    type="text"
                    placeholder="手机 IP 地址 (如 192.168.31.198)"
                    value={wifiHost}
                    onChange={(e) => setWifiHost(e.target.value)}
                    style={{
                      flex: 1,
                      height: '34px',
                      padding: '0 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--dsw-alias-border-l2, #cbd5e1)',
                      fontSize: '12px',
                      background: '#ffffff',
                      color: 'var(--dsw-alias-label-primary, #0f172a)',
                      outline: 'none',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="连接端口 (默认 5555)"
                    value={wifiPort}
                    onChange={(e) => setWifiPort(e.target.value)}
                    style={{
                      width: '150px',
                      height: '34px',
                      padding: '0 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--dsw-alias-border-l2, #cbd5e1)',
                      fontSize: '12px',
                      background: '#ffffff',
                      color: 'var(--dsw-alias-label-primary, #0f172a)',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={connecting}
                    style={{
                      height: '34px',
                      padding: '0 20px',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#10B981',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: connecting ? 'not-allowed' : 'pointer',
                      opacity: connecting ? 0.7 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {connecting ? '连接中...' : '连接'}
                  </button>
                </div>
                {connectError && (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(239, 68, 68, 0.06)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12px',
                      color: '#dc2626',
                      lineHeight: 1.4,
                    }}
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ flexShrink: 0 }}
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{connectError}</span>
                  </div>
                )}
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--dsw-alias-label-tertiary, #64748b)',
                    marginTop: '8px',
                    lineHeight: '1.4',
                  }}
                >
                  💡
                  首次连接请先切换到「配对码配对」完成授权；已配对设备直接输入主页的「IP
                  地址与连接端口」。
                </div>
              </form>
            ) : (
              <form onSubmit={handlePairWifi}>
                <div
                  style={{
                    fontSize: '11px',
                    color: '#047857',
                    background: 'rgba(16, 185, 129, 0.08)',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    marginBottom: '10px',
                    lineHeight: '1.4',
                  }}
                >
                  📱
                  在手机【无线调试】中点击【使用配对码配对设备】，保持弹窗开启，将弹窗内的临时端口与
                  6 位配对码填入下方：
                </div>
                <div
                  style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
                >
                  <input
                    type="text"
                    placeholder="手机 IP (如 192.168.31.198)"
                    value={wifiHost}
                    onChange={(e) => setWifiHost(e.target.value)}
                    style={{
                      flex: '1.2',
                      minWidth: '130px',
                      height: '34px',
                      padding: '0 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--dsw-alias-border-l2, #cbd5e1)',
                      fontSize: '12px',
                      background: '#ffffff',
                      color: 'var(--dsw-alias-label-primary, #0f172a)',
                      outline: 'none',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="临时配对端口"
                    value={wifiPort}
                    onChange={(e) => setWifiPort(e.target.value)}
                    style={{
                      width: '105px',
                      flexShrink: 0,
                      height: '34px',
                      padding: '0 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--dsw-alias-border-l2, #cbd5e1)',
                      fontSize: '12px',
                      background: '#ffffff',
                      color: 'var(--dsw-alias-label-primary, #0f172a)',
                      outline: 'none',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="6 位配对码"
                    value={pairCode}
                    onChange={(e) => setPairCode(e.target.value)}
                    style={{
                      width: '95px',
                      flexShrink: 0,
                      height: '34px',
                      padding: '0 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--dsw-alias-border-l2, #cbd5e1)',
                      fontSize: '12px',
                      background: '#ffffff',
                      color: 'var(--dsw-alias-label-primary, #0f172a)',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={pairing}
                    style={{
                      height: '34px',
                      padding: '0 18px',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#10B981',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: pairing ? 'not-allowed' : 'pointer',
                      opacity: pairing ? 0.7 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {pairing ? '配对中...' : '执行配对'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* 底部 */}
        <div
          style={{
            padding: '14px 24px',
            borderTop:
              '1px solid var(--dsw-alias-border-l2, var(--dsw-alias-border, #f1f5f9))',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={handleClose}
            style={{
              height: '32px',
              padding: '0 16px',
              borderRadius: '6px',
              border: '1px solid var(--dsw-alias-border-l2, #cbd5e1)',
              background: '#ffffff',
              color: 'var(--dsw-alias-label-primary, #334155)',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            完成
          </button>
        </div>
      </div>

      {/* 4. 屏幕快照预览模态弹窗 */}
      {previewDeviceId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setPreviewDeviceId(null)}
        >
          <div
            style={{
              maxHeight: '92vh',
              maxWidth: '420px',
              background: '#000000',
              borderRadius: '16px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              border: '2px solid rgba(255, 255, 255, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '10px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#18181b',
                color: '#ffffff',
                fontSize: '12px',
              }}
            >
              <span>手机实时快照 ({previewDeviceId})</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewLoading(true);
                    setPreviewTimestamp(Date.now());
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#10B981',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  刷新
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDeviceId(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#9ca3af',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  关闭
                </button>
              </div>
            </div>
            <div
              style={{
                padding: '8px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '300px',
                background: '#09090b',
              }}
            >
              <img
                src={`/api/jingyun/connectors/mobile/screenshot?deviceId=${encodeURIComponent(
                  previewDeviceId
                )}&t=${previewTimestamp}`}
                alt="Phone Screen Preview"
                onLoad={() => setPreviewLoading(false)}
                onError={() => {
                  setPreviewLoading(false);
                  showToast('加载屏幕快照失败，请检查手机是否在线');
                }}
                style={{
                  maxWidth: '100%',
                  maxHeight: '80vh',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  opacity: previewLoading ? 0.5 : 1,
                  transition: 'opacity 0.2s',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
