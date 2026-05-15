'use client'

import { WaTemplate, WaTemplateComponent } from '@/lib/types'

interface WhatsAppPreviewProps {
  template: WaTemplate | null
  variables?: Record<string, string>
}

function resolveText(text: string, variables: Record<string, string>): string {
  return text.replace(/\{\{(\d+)\}\}/g, (_, idx) => {
    const key = `var${parseInt(idx)}`
    return variables[key] || `{{${idx}}}`
  })
}

function getBodyText(components: WaTemplateComponent[]): string {
  return components.find((c) => c.type === 'BODY')?.text || ''
}

function getHeaderComponent(components: WaTemplateComponent[]): WaTemplateComponent | undefined {
  return components.find((c) => c.type === 'HEADER')
}

function getFooterText(components: WaTemplateComponent[]): string {
  return components.find((c) => c.type === 'FOOTER')?.text || ''
}

function getButtons(components: WaTemplateComponent[]) {
  return components.find((c) => c.type === 'BUTTONS')?.buttons || []
}

export function WhatsAppPreview({ template, variables = {} }: WhatsAppPreviewProps) {
  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[350px] text-muted-foreground gap-3">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-8 h-8 fill-muted-foreground/60">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </div>
        <p className="text-center text-sm max-w-[200px]">
          Selecione um template para visualizar como a mensagem sera recebida
        </p>
      </div>
    )
  }

  const header = getHeaderComponent(template.components)
  const bodyText = getBodyText(template.components)
  const footerText = getFooterText(template.components)
  const buttons = getButtons(template.components)
  const resolvedBody = resolveText(bodyText, variables)
  const resolvedHeader = header?.text ? resolveText(header.text, variables) : ''

  const now = new Date()
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex flex-col h-full">
      {/* iPhone frame */}
      <div className="mx-auto w-full max-w-[340px]">
        {/* Phone notch */}
        <div className="bg-[#1f1f1f] h-7 rounded-t-3xl flex items-center justify-center">
          <div className="w-20 h-5 bg-black rounded-full" />
        </div>

        {/* WhatsApp chrome */}
        <div className="bg-[#1f1f1f] overflow-hidden shadow-2xl">
          {/* WhatsApp header */}
          <div className="bg-[#1f2c34] px-3 py-2.5 flex items-center gap-3">
            <div className="w-4 h-4 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#aebac1]">
                <path d="M12 4l1.41 1.41L7.83 11H20v2H7.83l5.58 5.59L12 20l-8-8z" />
              </svg>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#6a7175] flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#cfd4d6]">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-[15px] font-medium leading-tight truncate">Empresa</p>
              <p className="text-[#8696a0] text-xs">online</p>
            </div>
            <div className="flex items-center gap-4">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#aebac1]">
                <path d="M15 12c0 1.654-1.346 3-3 3s-3-1.346-3-3 1.346-3 3-3 3 1.346 3 3zm9-.449s-4.252 8.449-11.985 8.449c-7.18 0-12.015-8.449-12.015-8.449s4.446-7.551 12.015-7.551c7.694 0 11.985 7.551 11.985 7.551zm-7 .449c0-2.757-2.243-5-5-5s-5 2.243-5 5 2.243 5 5 5 5-2.243 5-5z" />
              </svg>
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#aebac1]">
                <path d="M12 7a2 2 0 1 0-.001-4.001A2 2 0 0 0 12 7zm0 2a2 2 0 1 0-.001 4.001A2 2 0 0 0 12 9zm0 6a2 2 0 1 0-.001 4.001A2 2 0 0 0 12 15z" />
              </svg>
            </div>
          </div>

          {/* Chat background */}
          <div
            className="px-3 py-4 min-h-[340px] flex flex-col justify-end gap-2"
            style={{
              backgroundColor: '#0b141a',
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23182229' fill-opacity='0.5'%3E%3Ccircle cx='10' cy='10' r='1'/%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3Ccircle cx='50' cy='10' r='1'/%3E%3Ccircle cx='70' cy='30' r='1'/%3E%3Ccircle cx='90' cy='10' r='1'/%3E%3Ccircle cx='10' cy='50' r='1'/%3E%3Ccircle cx='30' cy='70' r='1'/%3E%3Ccircle cx='50' cy='50' r='1'/%3E%3Ccircle cx='70' cy='70' r='1'/%3E%3Ccircle cx='90' cy='50' r='1'/%3E%3Ccircle cx='10' cy='90' r='1'/%3E%3Ccircle cx='50' cy='90' r='1'/%3E%3Ccircle cx='90' cy='90' r='1'/%3E%3C/g%3E%3C/svg%3E")`,
            }}
          >
            {/* Message bubble */}
            <div className="max-w-[90%] self-start">
              <div className="bg-[#202c33] rounded-lg rounded-tl-none overflow-hidden shadow-sm">
                {/* Header */}
                {header && (
                  <div className="bg-[#1d282f]">
                    {header.format === 'IMAGE' && (
                      <div className="w-full aspect-video bg-[#2a3942] flex items-center justify-center">
                        <svg className="w-10 h-10 text-[#8696a0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                        </svg>
                      </div>
                    )}
                    {header.format === 'VIDEO' && (
                      <div className="w-full aspect-video bg-[#2a3942] flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
                          <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    )}
                    {header.format === 'DOCUMENT' && (
                      <div className="p-3 flex items-center gap-3">
                        <div className="w-10 h-12 bg-[#00a884] rounded flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#e9edef] truncate">documento.pdf</p>
                          <p className="text-xs text-[#8696a0]">PDF</p>
                        </div>
                      </div>
                    )}
                    {header.format === 'TEXT' && resolvedHeader && (
                      <div className="px-3 pt-2">
                        <p className="text-[14px] font-semibold text-[#e9edef]">
                          {resolvedHeader}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Body */}
                <div className="px-3 py-2">
                  <p className="text-[14px] text-[#e9edef] whitespace-pre-wrap leading-[1.4]">
                    {resolvedBody || 'Corpo da mensagem...'}
                  </p>
                </div>

                {/* Footer */}
                {footerText && (
                  <div className="px-3 pb-1">
                    <p className="text-[12px] text-[#8696a0]">{footerText}</p>
                  </div>
                )}

                {/* Time */}
                <div className="flex justify-end items-center gap-1 px-2 pb-2">
                  <span className="text-[11px] text-[#8696a0]">{timeStr}</span>
                </div>
              </div>

              {/* Buttons */}
              {buttons.length > 0 && (
                <div className="mt-1 flex flex-col gap-1">
                  {buttons.map((btn, i) => (
                    <div
                      key={i}
                      className="bg-[#202c33] rounded-lg text-center py-2.5 px-3 text-[14px] text-[#53bdeb] font-medium border border-[#2a3942]"
                    >
                      {btn.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Input bar */}
          <div className="bg-[#1f2c34] px-2 py-2 flex items-center gap-2">
            <div className="w-10 h-10 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#8696a0]">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2.546 20.2A1 1 0 0 0 3.8 21.454l3.032-.892A9.96 9.96 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm-4 3a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm8 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
              </svg>
            </div>
            <div className="flex-1 bg-[#2a3942] rounded-full px-4 py-2.5">
              <span className="text-[15px] text-[#8696a0]">Mensagem</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Phone bottom bar */}
        <div className="bg-[#1f1f1f] h-5 rounded-b-3xl flex items-center justify-center">
          <div className="w-28 h-1 bg-white/20 rounded-full" />
        </div>
      </div>
    </div>
  )
}
