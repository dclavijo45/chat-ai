import { MarkedOptions, MarkedRenderer } from 'ngx-markdown';

/**
 * @description Factory function to create a custom markdown renderer
 */
export const markdownRendererFactory = (): MarkedOptions => {
    const renderer = new MarkedRenderer();

    renderer.link = (link): string => {
        const text = link.href.replace("https://", "").replace("http://", "");
        return `<a href="${link.href}" target="_blank" rel="noopener noreferrer">${text}</a>`;;
    };
    return {
        renderer,
        gfm: true,
        breaks: true,
        pedantic: false,
    };
};
