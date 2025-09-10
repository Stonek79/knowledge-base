import { Container } from '@mui/material';

import { SearchPage } from '@/components/documents/search/SearchPage';

export default async function Search() {
    return (
        <Container>
            <SearchPage />
        </Container>
    );
}
