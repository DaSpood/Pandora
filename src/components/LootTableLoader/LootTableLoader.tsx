import {
    Accordion,
    AccordionBody,
    AccordionHeader,
    AccordionItem,
    Button,
    Col,
    Container,
    FormControl,
    FormLabel,
    FormSelect,
    InputGroup,
    ListGroup,
    ListGroupItem,
    Row,
} from 'react-bootstrap';
import { type ChangeEvent, useEffect, useMemo, useState } from 'react';
import type { LootTable } from '../../types/lootTable';
import type { Maybe } from '../../types/utils';
import { validateLootTable } from '../../scripts/lootTableValidator.ts';

export default function LootTableLoader() {
    const publicLootTables: LootTable[] = useMemo(
        () =>
            Object.values(
                import.meta.glob('/src/assets/lootTables/*.json', {
                    import: 'default',
                    eager: true,
                }),
            ),
        [],
    );

    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [selectedTable, setSelectedTable] = useState<Maybe<LootTable>>(publicLootTables[0]);
    const [uploadedTable, setUploadedTable] = useState<Maybe<File>>(undefined);
    const [submittedTable, setSubmittedTable] = useState<Maybe<LootTable>>(undefined);

    useEffect(() => {
        if (!submittedTable) return;
        const validationErrors = validateLootTable(submittedTable);
        setValidationErrors(validationErrors);
        if (!validationErrors.length) {
            console.log("LET'S GO GAMBLING!");
        }
    }, [submittedTable]);

    const submitUploadedFile = () => {
        if (!uploadedTable) return;
        const reader = new FileReader();
        reader.onloadend = () => setSubmittedTable(JSON.parse(reader.result?.toString() ?? '{}'));
        reader.readAsText(uploadedTable);
    };

    return (
        <Container fluid className="d-flex flex-column gap-4">
            <Row className="gap-4 gap-lg-0">
                <Col xs={12} lg={6}>
                    <FormLabel>Load a loot table</FormLabel>
                    <InputGroup>
                        <FormSelect
                            disabled={!publicLootTables.length}
                            onChange={(e) => setSelectedTable(publicLootTables[e.target.value as unknown as number])}
                        >
                            {!publicLootTables.length && <option>No pre-loaded table</option>}
                            {publicLootTables.map((table, idx) => (
                                <option key={idx} value={idx}>
                                    {table.game}: {table.eventName}
                                </option>
                            ))}
                        </FormSelect>
                        <Button
                            disabled={!publicLootTables.length}
                            variant="primary"
                            type="button"
                            onClick={() => setSubmittedTable(selectedTable)}
                        >
                            LET'S GO GAMBLING!
                        </Button>
                    </InputGroup>
                </Col>
                <Col xs={12} lg={6}>
                    <FormLabel>Upload your loot table</FormLabel>
                    <InputGroup>
                        <FormControl
                            type="file"
                            accept=".json"
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setUploadedTable(e.target.files?.[0])}
                        />
                        <Button
                            variant="primary"
                            type="button"
                            disabled={!uploadedTable}
                            onClick={() => submitUploadedFile()}
                        >
                            LET'S GO GAMBLING!
                        </Button>
                    </InputGroup>
                </Col>
            </Row>
            {validationErrors.length > 0 && (
                <Row>
                    <Accordion>
                        <AccordionItem eventKey="0">
                            <AccordionHeader>Validation Errors</AccordionHeader>
                            <AccordionBody className="p-0">
                                <ListGroup className="list-group-flush text-start m-0">
                                    <ListGroupItem>Aw dang it!</ListGroupItem>
                                    {validationErrors.map((error, idx) => (
                                        <ListGroupItem key={idx}>{error}</ListGroupItem>
                                    ))}
                                </ListGroup>
                            </AccordionBody>
                        </AccordionItem>
                    </Accordion>
                </Row>
            )}
        </Container>
    );
}
