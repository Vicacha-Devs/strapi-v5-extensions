import * as React from 'react';
import type { OpenGraphImage } from '../../../../../../../../shared';

interface FacebookOGPreviewProps {
  image: OpenGraphImage;
  title: string;
  description: string;
}

export const FacebookOGPreview = ({ image, title, description }: FacebookOGPreviewProps) => {
  return (
    <div
      style={{
        width: '500px',
        border: '1px solid #dadde1',
        fontFamily: 'Helvetica, Arial, sans-serif',
        cursor: 'pointer',
        margin: 'auto',
        marginBottom: '40px',
      }}
    >
      <div
        style={{
          borderBottom: '1px solid #dadde1',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div style={{ width: '100%', position: 'relative', paddingTop: '52.5%' }}>
          <img
            src={image.url}
            alt={title}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>
      </div>

      <div style={{ backgroundColor: '#f2f3f5', padding: '12px 10px', lineHeight: '1.4' }}>
        <div
          style={{
            fontSize: '12px',
            textTransform: 'uppercase',
            color: '#606770',
            marginBottom: '4px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          your-site.io
        </div>

        <div
          style={{
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#1d2129',
            marginBottom: '4px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title.substring(0, 65)}
        </div>

        <div
          style={{
            fontSize: '14px',
            color: '#606770',
            maxHeight: '40px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            display: '-webkit-box',
          }}
        >
          {description.substring(0, 150)}
        </div>
      </div>
    </div>
  );
};
