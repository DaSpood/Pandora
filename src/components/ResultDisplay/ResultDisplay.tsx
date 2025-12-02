import { Col, Container, Image, Row } from 'react-bootstrap';
import type { OpeningSession } from '../../types/state';
import type { Maybe } from '../../types/utils';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

export default function ResultDisplay({
    session,
    simulationResult,
}: {
    session: OpeningSession;
    simulationResult: Maybe<number[]>;
}) {
    const renderSimulationResultGraph = () => {
        if (!simulationResult?.length) return;

        const uniquePoints = Array.from(new Set(simulationResult));
        const firstQuartile = uniquePoints.sort((a, b) => a - b)[Math.round(uniquePoints.length / 4)];
        const median = uniquePoints.sort((a, b) => a - b)[Math.round(uniquePoints.length / 2)];
        const thirdQuartile = uniquePoints.sort((a, b) => a - b)[Math.round(uniquePoints.length / 4) * 3];
        const min = Math.min(...uniquePoints);
        const avg = Math.round(uniquePoints.reduce((acc, val) => acc + val, 0) / uniquePoints.length);
        const max = Math.max(...uniquePoints);

        const series = [
            {
                name: 'Boxes required to reach goal',
                data: uniquePoints.map((x) => ({
                    x: x,
                    y: simulationResult.filter((val) => val === x).length,
                })),
            },
        ];

        const options = {
            title: {
                text: `${new Intl.NumberFormat('en-US').format(simulationResult.length).replaceAll(',', ' ')} simulations`,
            },
            tooltip: {
                enabled: false,
            },
            chart: {
                id: 'simulation-chart',
                background: 'white',
                toolbar: {
                    show: false,
                },
            },
            xaxis: {
                type: 'numeric',
                title: {
                    text: 'Number of boxes purchased',
                },
            },
            yaxis: {
                title: {
                    text: 'Frequency',
                },
            },
            dataLabels: {
                enabled: false,
            },
            stroke: {
                curve: 'smooth',
            },
        } as unknown as ApexOptions;

        return (
            <Container className="d-flex flex-column justify-content-center">
                {simulationResult.length >= 8000 && (
                    <>
                        <Container className="w-auto m-auto d-md-none d-inline-block">
                            <h4>Results after {simulationResult.length} iterations</h4>
                            <p className="text-muted">
                                <i>Screen too small to display a graph)</i>
                            </p>
                            <br />
                        </Container>
                        <Container className="d-none d-md-inline-block">
                            <Chart options={options} series={series} type="area" height="450px" />
                        </Container>
                    </>
                )}
                {simulationResult.length < 8000 && (
                    <Container className="w-auto m-auto">
                        <h4>Results after {simulationResult.length} iterations</h4>
                        <p className="text-muted">
                            <i>Launch 8000 simulations or more to generate a graph (disabled on small devices)</i>
                        </p>
                        <br />
                    </Container>
                )}
                <Row className="w-100 p-0 justify-content-center">
                    <Col className="col-auto p-0">
                        <ul>
                            <li>Minimum: {min}</li>
                            <li>Average: {avg}</li>
                            <li>Maximum: {max}</li>
                        </ul>
                    </Col>
                    <Col className="col-auto p-0">
                        <ul>
                            <li>1st Quartile: {firstQuartile}</li>
                            <li>Median: {median}</li>
                            <li>3rd Quartile: {thirdQuartile}</li>
                        </ul>
                    </Col>
                </Row>
            </Container>
        );
    };

    return (
        <Container fluid>
            <Row className="d-flex justify-content-center">
                {simulationResult && renderSimulationResultGraph()}
                {session.history.length > 0 &&
                    !simulationResult &&
                    session.history[session.history.length - 1].drops.map((drop, idx) => (
                        <Col key={idx} className="col-4 col-lg-2">
                            <Container
                                className={`h-100 d-flex flex-column justify-content-between p-2 bg-gradient rounded text-center ${drop.rarityInUi === 'main' ? 'border border-warning' : ''} ${drop.rarityInUi === 'secondary' ? 'border border-info' : ''}`}
                            >
                                <Image
                                    src={
                                        session.referenceLootTableUniqueDrops[drop.lootTableBranch.drop.name]?.drop
                                            .pictureUrl || 'images/default-loot-icon.png'
                                    }
                                    alt={drop.lootTableBranch.drop.name}
                                    className="object-fit-contain flex-grow-1"
                                />
                                <p>
                                    {drop.amount}x {drop.lootTableBranch.drop.name}
                                </p>
                            </Container>
                        </Col>
                    ))}
                {session.history.length == 0 && !simulationResult && (
                    <p className="d-block d-lg-none text-center">
                        This app is not intended to be used on a mobile device. If the "open" button is hidden, you can
                        zoom-in, scroll down and zoom-out to collapse the browser's search bar and display the whole
                        page. I would recommend using a PC instead, though, other features may not display as intended
                        either.
                    </p>
                )}
            </Row>
        </Container>
    );
}
