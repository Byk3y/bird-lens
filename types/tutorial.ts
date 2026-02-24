export interface Tutorial {
    id: string;
    slug: string;
    title: string;
    category: string;
    cover_image_url: string;
    markdown_content: string;
    cta_label?: string;
    is_featured?: boolean;
    created_at: string;
    updated_at: string;
}
