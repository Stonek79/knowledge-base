// src/lib/search/singleton.ts
import { FlexSearchIndexer } from './flexsearch-indexer';

let instance: FlexSearchIndexer | null = null;
export const getFlexSearch = () => (instance ??= new FlexSearchIndexer());
