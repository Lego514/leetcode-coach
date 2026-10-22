import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { shareCardSvg, SHARE_SIZE, type ShareCardInput } from '../lib/shareCard';
import { Dialog } from './ui';

// 分享成圖片：把畫面上的演算法樹（套上目前主題的顏色）和這週的數字排成一張圖，可以下載或用手機的分享

/** 樹要畫成圖片時，class 的樣式不會跟著走，所以把算出來的顏色和線條寫進每個元素 */
const STYLE_PROPS = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'opacity', 'font-size', 'font-weight'] as const;

export function inlineTree(svg: SVGSVGElement): { markup: string; viewBox: string } {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const source = [svg, ...svg.querySelectorAll('*')];
  const target = [clone, ...clone.querySelectorAll('*')];
  source.forEach((node, i) => {
    const style = getComputedStyle(node);
    const out = target[i] as SVGElement;
    for (const prop of STYLE_PROPS) {
      const value = style.getPropertyValue(prop);
      if (value) out.setAttribute(prop, value);
    }
    out.removeAttribute('class');
    out.removeAttribute('data-picked');
  });
  return { markup: clone.innerHTML, viewBox: svg.getAttribute('viewBox') ?? '' };
}

function svgToPng(svg: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = SHARE_SIZE.width;
      canvas.height = SHARE_SIZE.height;
      canvas.getContext('2d')!.drawImage(image, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png');
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image failed to load'));
    };
    image.src = url;
  });
}

/** 目前主題的顏色，讓圖片跟畫面一樣（深色模式就是深色的圖） */
function themeColors(): ShareCardInput['colors'] {
  const style = getComputedStyle(document.documentElement);
  const v = (name: string) => style.getPropertyValue(name).trim();
  return { background: v('--sheet'), ink: v('--ink'), muted: v('--ink-3'), accent: v('--pen'), rule: v('--rule') };
}

export function ShareTreeButton({
  getTree,
  content,
  fileName,
}: {
  getTree: () => SVGSVGElement | null;
  content: Omit<ShareCardInput, 'tree' | 'colors' | 'font'>;
  fileName: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [image, setImage] = useState<{ url: string; file: File } | null>(null);
  const [failed, setFailed] = useState(false);

  // 關掉時釋放圖片
  useEffect(() => () => void (image && URL.revokeObjectURL(image.url)), [image]);

  async function make() {
    setOpen(true);
    setFailed(false);
    setImage(null);
    const svg = getTree();
    if (!svg) return setFailed(true);
    try {
      const blob = await svgToPng(
        shareCardSvg({ ...content, tree: inlineTree(svg), colors: themeColors(), font: getComputedStyle(document.body).fontFamily }),
      );
      setImage({ url: URL.createObjectURL(blob), file: new File([blob], fileName, { type: 'image/png' }) });
    } catch {
      setFailed(true);
    }
  }

  const canShare = !!image && typeof navigator.canShare === 'function' && navigator.canShare({ files: [image.file] });

  return (
    <>
      <button type="button" className="btn btn-small" onClick={() => void make()}>
        {t.share.button}
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t.share.title}
        subtitle={t.share.subtitle}
        footer={
          <>
            <button type="button" className="btn btn-quiet" onClick={() => setOpen(false)}>
              {t.common.close}
            </button>
            {canShare && (
              <button type="button" className="btn" onClick={() => void navigator.share({ files: [image.file] }).catch(() => {})}>
                {t.share.share}
              </button>
            )}
            {image && (
              <a className="btn btn-primary" href={image.url} download={fileName}>
                {t.share.download}
              </a>
            )}
          </>
        }
      >
        {failed ? (
          <p role="alert">{t.share.failed}</p>
        ) : image ? (
          <img className="share-preview" src={image.url} alt={t.share.alt} width={SHARE_SIZE.width} height={SHARE_SIZE.height} />
        ) : (
          <p>{t.share.making}</p>
        )}
      </Dialog>
    </>
  );
}
