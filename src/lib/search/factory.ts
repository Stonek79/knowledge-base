import { SearchEngine } from '@/constants/document'

import { DocumentIndexer } from './indexer'
import { getFlexSearch } from './singleton'

export class SearchFactory {
    static createIndexer(
        engine: (typeof SearchEngine)[keyof typeof SearchEngine]
    ) {
        switch (engine) {
            // case SearchEngine.ELASTICSEARCH:
            //     return new ElasticsearchIndexer();
            case SearchEngine.FLEXSEARCH:
                console.log('[FLEXSEARCH]', engine)
                return getFlexSearch()
            default:
                return new DocumentIndexer()
        }
    }
}
