import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  HeadingLevel,
  ShadingType,
  ImageRun,
} from 'docx';
import { InterventionFormData, PieceItem } from '../types/intervention';

function base64ToUint8Array(dataUrl: string): Uint8Array {
  const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  const binaryString = atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function generateInterventionDocx(data: InterventionFormData): Promise<Blob> {
  const primaryBlue = '1E3A8A'; // Industrial Deep Blue
  const accentYellow = 'EAB308'; // Safety Yellow
  const darkText = '0F172A';
  const lightGrayBg = 'F8FAFC';
  const headerBg = '1E3A8A';
  const tableBorderColor = 'CBD5E1';

  const defaultBorder = {
    top: { style: BorderStyle.SINGLE, size: 1, color: tableBorderColor },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: tableBorderColor },
    left: { style: BorderStyle.SINGLE, size: 1, color: tableBorderColor },
    right: { style: BorderStyle.SINGLE, size: 1, color: tableBorderColor },
  };

  const noBorder = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  };

  // Build Vehicle Specs Table
  const vehicleName = data.vehicule || data.equipement || 'Non spécifié';
  const immatVin = data.vin ? `${data.immatriculation || 'N/A'} (VIN: ${data.vin})` : (data.immatriculation || 'Non renseigné');
  const vehicleStatus = data.statutVehicule || data.statutMachine || 'Prêt à rouler / Conforme';
  const statusColor = vehicleStatus.includes('Prêt') ? '15803D' : vehicleStatus.includes('Immobilisé') ? 'B91C1C' : 'B45309';

  const machineInfoRows = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 3000, type: WidthType.DXA },
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: 'Véhicule / Modèle', bold: true, color: primaryBlue })] })],
        }),
        new TableCell({
          width: { size: 6000, type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun({ text: vehicleName, bold: true, color: darkText })] })],
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: 'Immatriculation & VIN', bold: true, color: primaryBlue })] })],
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: immatVin, bold: true, color: darkText })] })],
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: 'Intervention mécanique', bold: true, color: primaryBlue })] })],
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: data.typeIntervention, bold: true, color: darkText })] })],
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: 'Kilométrage relevé', bold: true, color: primaryBlue })] })],
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: data.compteurValeur !== '' ? `${Number(data.compteurValeur).toLocaleString('fr-FR')} ${data.compteurUnite || 'Km'}` : 'Non renseigné',
                  bold: true,
                  color: darkText,
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: 'État du véhicule', bold: true, color: primaryBlue })] })],
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: vehicleStatus, bold: true, color: statusColor })] })],
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: 'Temps d\'atelier / Durée', bold: true, color: primaryBlue })] })],
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: data.dureeEstimee || 'Non précisée', color: darkText })] })],
        }),
      ],
    }),
  ];

  const machineTable = new Table({
    width: { size: 9000, type: WidthType.DXA },
    borders: defaultBorder,
    rows: machineInfoRows,
  });

  // Build Parts Table
  const partsTableRows = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 3800, type: WidthType.DXA },
          shading: { fill: headerBg, type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: 'Pièce de remplacement & Réf.', bold: true, color: 'FFFFFF' })] })],
        }),
        new TableCell({
          width: { size: 2800, type: WidthType.DXA },
          shading: { fill: headerBg, type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: 'Organe remplacé & Motif', bold: true, color: 'FFFFFF' })] })],
        }),
        new TableCell({
          width: { size: 1200, type: WidthType.DXA },
          shading: { fill: headerBg, type: ShadingType.CLEAR },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Qté', bold: true, color: 'FFFFFF' })] })],
        }),
        new TableCell({
          width: { size: 1200, type: WidthType.DXA },
          shading: { fill: headerBg, type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: 'Unité', bold: true, color: 'FFFFFF' })] })],
        }),
      ],
    }),
  ];

  if (data.pieces && data.pieces.length > 0) {
    data.pieces.forEach((p: PieceItem, index: number) => {
      const refText = p.reference ? ` (Réf: ${p.reference})` : '';
      const motifText = p.motifRemplacement ? ` [${p.motifRemplacement}]` : '';
      const remplaceText = p.pieceRemplacee ? `${p.pieceRemplacee}${motifText}` : (p.motifRemplacement || 'Remplacement standard');

      partsTableRows.push(
        new TableRow({
          children: [
            new TableCell({
              shading: index % 2 === 1 ? { fill: lightGrayBg, type: ShadingType.CLEAR } : undefined,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: p.designation || 'Pièce', bold: true, color: darkText }),
                    new TextRun({ text: refText, color: '64748B', size: 16 }),
                  ],
                }),
              ],
            }),
            new TableCell({
              shading: index % 2 === 1 ? { fill: lightGrayBg, type: ShadingType.CLEAR } : undefined,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: remplaceText, color: darkText, size: 18 }),
                  ],
                }),
              ],
            }),
            new TableCell({
              shading: index % 2 === 1 ? { fill: lightGrayBg, type: ShadingType.CLEAR } : undefined,
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: String(p.quantite || 1), bold: true, color: darkText })] })],
            }),
            new TableCell({
              shading: index % 2 === 1 ? { fill: lightGrayBg, type: ShadingType.CLEAR } : undefined,
              children: [new Paragraph({ children: [new TextRun({ text: p.unite || 'pièce', color: darkText })] })],
            }),
          ],
        })
      );
    });
  } else {
    partsTableRows.push(
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 4,
            children: [new Paragraph({ children: [new TextRun({ text: 'Aucune pièce détachée ou consommable utilisé.', italics: true, color: '64748B' })] })],
          }),
        ],
      })
    );
  }

  const partsTable = new Table({
    width: { size: 9000, type: WidthType.DXA },
    borders: defaultBorder,
    rows: partsTableRows,
  });

  // Build technician signature cell children
  const techCellChildren = [
    new Paragraph({
      children: [
        new TextRun({ text: 'VISA DU TECHNICIEN', bold: true, color: primaryBlue, size: 20 }),
      ],
    }),
    new Paragraph({
      children: [new TextRun({ text: `Nom : ${data.nomSignataireTechnicien || data.technicien || 'Technicien intervenant'}`, size: 18 })],
    }),
    new Paragraph({
      children: [new TextRun({ text: `Date : ${data.date || new Date().toLocaleDateString('fr-FR')}`, size: 18 })],
    }),
  ];

  if (data.signatureTechnicien) {
    try {
      techCellChildren.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: base64ToUint8Array(data.signatureTechnicien),
              transformation: {
                width: 160,
                height: 55,
              },
              type: 'png',
            }),
          ],
        })
      );
      techCellChildren.push(
        new Paragraph({
          children: [new TextRun({ text: '[Signature électronique horodatée]', italics: true, color: '15803D', size: 14 })],
        })
      );
    } catch (e) {
      techCellChildren.push(new Paragraph({ children: [new TextRun({ text: 'Signature enregistrée', color: '15803D' })] }));
    }
  } else {
    techCellChildren.push(new Paragraph({ text: '' }));
    techCellChildren.push(new Paragraph({ text: '' }));
    techCellChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'Signature manuscrite :', italics: true, color: '94A3B8', size: 16 })],
      })
    );
  }

  // Build client signature cell children
  const clientCellChildren = [
    new Paragraph({
      children: [
        new TextRun({ text: 'VISA RESPONSABLE / CLIENT', bold: true, color: primaryBlue, size: 20 }),
      ],
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Bon pour accord des travaux réalisés', size: 18 })],
    }),
    new Paragraph({
      children: [new TextRun({ text: `Nom : ${data.nomSignataireClient || 'Responsable / Client'}`, size: 18 })],
    }),
  ];

  if (data.signatureClient) {
    try {
      clientCellChildren.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: base64ToUint8Array(data.signatureClient),
              transformation: {
                width: 160,
                height: 55,
              },
              type: 'png',
            }),
          ],
        })
      );
      clientCellChildren.push(
        new Paragraph({
          children: [new TextRun({ text: '[Signature électronique horodatée]', italics: true, color: '15803D', size: 14 })],
        })
      );
    } catch (e) {
      clientCellChildren.push(new Paragraph({ children: [new TextRun({ text: 'Signature enregistrée', color: '15803D' })] }));
    }
  } else {
    clientCellChildren.push(new Paragraph({ text: '' }));
    clientCellChildren.push(new Paragraph({ text: '' }));
    clientCellChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'Date & Cachet / Signature :', italics: true, color: '94A3B8', size: 16 })],
      })
    );
  }

  // Signatures Table
  const signaturesTable = new Table({
    width: { size: 9000, type: WidthType.DXA },
    borders: defaultBorder,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 4500, type: WidthType.DXA },
            shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
            children: techCellChildren,
          }),
          new TableCell({
            width: { size: 4500, type: WidthType.DXA },
            shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
            children: clientCellChildren,
          }),
        ],
      }),
    ],
  });

  // Build document body paragraphs
  const docChildren = [
    // Top Brand & Title Bar
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.HEADING_1,
      children: [
        new TextRun({
          text: 'MICRO-CARNET AUTO',
          bold: true,
          color: primaryBlue,
          size: 32,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'FICHE D\'INTERVENTION MÉCANIQUE & SUIVI D\'ATELIER VÉHICULE',
          bold: true,
          color: '475569',
          size: 20,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({
          text: `Fiche N° : ${data.numeroRapport}  |  Date : ${data.date || new Date().toISOString().split('T')[0]}`,
          color: '64748B',
          size: 18,
        }),
      ],
    }),
    new Paragraph({ text: '' }),

    // Section 1: Identification
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [
        new TextRun({
          text: '1. IDENTIFICATION DU VÉHICULE & KILOMÉTRAGE',
          bold: true,
          color: primaryBlue,
          size: 22,
        }),
      ],
    }),
    machineTable,
    new Paragraph({ text: '' }),

    // Section 2: Travaux
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [
        new TextRun({
          text: '2. OPÉRATIONS MÉCANIQUES & TRAVAUX EFFECTUÉS',
          bold: true,
          color: primaryBlue,
          size: 22,
        }),
      ],
    }),
  ];

  if (data.travaux && data.travaux.length > 0) {
    data.travaux.forEach((travail: string, i: number) => {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: `[✓]  ${travail}`, bold: false, color: darkText }),
          ],
        })
      );
    });
  } else {
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Aucune description d\'opération spécifiée.', italics: true, color: '64748B' }),
        ],
      })
    );
  }

  docChildren.push(new Paragraph({ text: '' }));

  // Section 3: Pièces
  docChildren.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [
        new TextRun({
          text: '3. PIÈCES AUTOMOBILES REMPLACÉES & CONSOMMABLES INSTALLÉS',
          bold: true,
          color: primaryBlue,
          size: 22,
        }),
      ],
    })
  );
  docChildren.push(partsTable);
  docChildren.push(new Paragraph({ text: '' }));

  // Section 4: Anomalies
  docChildren.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [
        new TextRun({
          text: '4. OBSERVATIONS & ANOMALIES CONSTATÉES',
          bold: true,
          color: primaryBlue,
          size: 22,
        }),
      ],
    })
  );

  const anomaliesContent = data.anomalies?.trim() || 'Aucune anomalie ou alerte sécurité particulière relevée.';
  const anomaliesTable = new Table({
    width: { size: 9000, type: WidthType.DXA },
    borders: defaultBorder,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: data.anomalies?.trim() ? 'FEF3C7' : 'F8FAFC', type: ShadingType.CLEAR },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: anomaliesContent,
                    color: data.anomalies?.trim() ? '92400E' : darkText,
                    bold: Boolean(data.anomalies?.trim()),
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
  docChildren.push(anomaliesTable);
  docChildren.push(new Paragraph({ text: '' }));

  // Section 5: Signatures
  docChildren.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [
        new TextRun({
          text: '5. VALIDATION TECHNIQUE & SIGNATURES',
          bold: true,
          color: primaryBlue,
          size: 22,
        }),
      ],
    })
  );
  docChildren.push(signaturesTable);

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: docChildren,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

export function downloadInterventionDocx(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
